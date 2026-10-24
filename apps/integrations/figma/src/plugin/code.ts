import type {
	InsertQrCodeParams,
	PlacementTarget,
	PluginMethod,
	PluginMethods,
	PluginToUiMessage,
	QrImage,
	UiToPluginMessage,
} from '../shared/messages';

const API_KEY_STORAGE_KEY = 'qrcodly.apiKey';
const INSERT_FORMAT_STORAGE_KEY = 'qrcodly.insertFormat';
const QR_CODE_ID_KEY = 'qrCodeId';

// Same heuristic as the InDesign plugin: ~18% of the container's shorter side.
const CONTAINER_FRACTION = 0.18;
const MIN_QR_PX = 64;
const MAX_QR_PX = 1024;
const VIEWPORT_QR_PX = 240;
// Smaller targets can't hold a scannable code, so they fall back to the viewport.
const MIN_TARGET_PX = 24;

const PARENT_TYPES = new Set<NodeType>(['PAGE', 'FRAME', 'COMPONENT', 'SECTION', 'GROUP']);
const CONTAINER_TYPES = new Set<NodeType>(['FRAME', 'COMPONENT', 'SECTION']);
const PLACEHOLDER_TYPES = new Set<NodeType>(['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR']);

type Parent = BaseNode & ChildrenMixin;

type Placement = {
	target: PlacementTarget;
	parent: Parent;
	index?: number;
	/** Centre of the code in the parent's coordinate space. */
	cx: number;
	cy: number;
	size: number;
	rotation: number;
	replaces?: SceneNode;
};

figma.showUI(__html__, { width: 360, height: 640, themeColors: true });

// Nodes inside an instance can't take new children, so those fall back to the viewport.
function canHostChildren(node: BaseNode | null): node is Parent {
	if (!node || !PARENT_TYPES.has(node.type)) return false;
	for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
		if (ancestor.type === 'INSTANCE') return false;
	}
	return true;
}

// Clicking inside a top-level QR frame selects one of its imported layers, not the frame.
function findQrNode(node: SceneNode): SceneNode | null {
	for (let n: BaseNode | null = node; n && n.type !== 'PAGE'; n = n.parent) {
		if (n.getPluginData(QR_CODE_ID_KEY)) return n as SceneNode;
	}
	return null;
}

function resolvePlacement(): Placement {
	const selection = figma.currentPage.selection;
	const selected = selection.length === 1 ? selection[0] : null;
	const qrNode = selected && findQrNode(selected);
	const node = qrNode ?? selected;

	if (node && 'width' in node && Math.min(node.width, node.height) >= MIN_TARGET_PX) {
		const fit = Math.min(node.width, node.height);

		const overNode = (mode: 'replace' | 'cover'): Placement | null => {
			const parent = node.parent;
			if (!canHostChildren(parent)) return null;
			// x/y is the rotated top-left corner, so take the centre from the full transform.
			const [[a, b, tx], [c, d, ty]] = node.relativeTransform;
			return {
				target: { mode, nodeName: node.name },
				parent,
				index: parent.children.indexOf(node) + 1,
				cx: tx + (a * node.width + b * node.height) / 2,
				cy: ty + (c * node.width + d * node.height) / 2,
				size: fit,
				// Angle of the local y-axis: matches node.rotation (not on every node type) and
				// ignores a horizontal flip, which a QR code must not inherit.
				rotation: (Math.atan2(b, d) * 180) / Math.PI,
				replaces: mode === 'replace' ? node : undefined,
			};
		};

		if (qrNode) {
			const placement = overNode('replace');
			if (placement) return placement;
		} else if (CONTAINER_TYPES.has(node.type) && canHostChildren(node)) {
			const empty = node.children.length === 0;
			const size = empty ? fit : Math.max(MIN_QR_PX, Math.min(MAX_QR_PX, fit * CONTAINER_FRACTION));
			return {
				target: { mode: empty ? 'fill' : 'inside', nodeName: node.name },
				parent: node,
				cx: node.width / 2,
				cy: node.height / 2,
				size,
				rotation: 0,
			};
		} else if (PLACEHOLDER_TYPES.has(node.type)) {
			const placement = overNode('cover');
			if (placement) return placement;
		}
	}

	const center = figma.viewport.center;
	return {
		target: { mode: 'viewport' },
		parent: figma.currentPage,
		cx: center.x,
		cy: center.y,
		size: VIEWPORT_QR_PX,
		rotation: 0,
	};
}

function createQrNode(image: QrImage): FrameNode | RectangleNode {
	if (image.format === 'svg') {
		try {
			return figma.createNodeFromSvg(image.svg);
		} catch {
			throw new Error('Figma could not import this QR code as a vector. Insert it as an image.');
		}
	}
	// Decode first: a throw here must not leave an empty rectangle on the canvas.
	const imageHash = figma.createImage(image.bytes).hash;
	const rect = figma.createRectangle();
	rect.fills = [{ type: 'IMAGE', imageHash, scaleMode: 'FIT' }];
	return rect;
}

function scaleTo(node: FrameNode | RectangleNode, size: number) {
	if (node.type !== 'FRAME') return node.resize(size, size);
	// rescale() rejects factors below 0.01, which a large SVG on a small target can need.
	let factor = size / node.width;
	while (factor < 0.01) {
		node.rescale(0.1);
		factor *= 10;
	}
	node.rescale(factor);
}

function placeAt(node: FrameNode | RectangleNode, { cx, cy, size, rotation }: Placement) {
	const rad = (rotation * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	node.relativeTransform = [
		[cos, sin, cx - ((cos + sin) * size) / 2],
		[-sin, cos, cy - ((cos - sin) * size) / 2],
	];
}

async function insertQrCode({ qrCodeId, name, image }: InsertQrCodeParams): Promise<void> {
	const placement = resolvePlacement();
	const { parent, replaces } = placement;
	const node = createQrNode(image);
	try {
		scaleTo(node, placement.size);
		node.lockAspectRatio();
		node.name = name;
		node.setPluginData(QR_CODE_ID_KEY, qrCodeId);

		if (placement.index === undefined) parent.appendChild(node);
		else parent.insertChild(placement.index, node);

		const autoLayout = 'layoutMode' in parent && parent.layoutMode !== 'NONE';
		if (
			autoLayout &&
			replaces &&
			'layoutPositioning' in replaces &&
			replaces.layoutPositioning === 'AUTO'
		) {
			// Take over the old code's slot; floating above it would let the layout reflow under it.
			node.layoutAlign = replaces.layoutAlign;
			node.layoutGrow = replaces.layoutGrow;
		} else {
			if (autoLayout) node.layoutPositioning = 'ABSOLUTE';
			if (replaces && 'constraints' in replaces) node.constraints = replaces.constraints;
			placeAt(node, placement);
		}
	} catch (error) {
		node.remove();
		throw error;
	}

	replaces?.remove();
	// Keeping the new code selected lets the next click swap it for another one.
	figma.currentPage.selection = [node];
	figma.notify(replaces ? 'QR code replaced' : 'QR code inserted', { timeout: 2000 });
}

const handlers: {
	[M in PluginMethod]: (params: PluginMethods[M]['params']) => Promise<PluginMethods[M]['result']>;
} = {
	getSettings: async () => {
		const apiKey: unknown = await figma.clientStorage.getAsync(API_KEY_STORAGE_KEY);
		const insertFormat: unknown = await figma.clientStorage.getAsync(INSERT_FORMAT_STORAGE_KEY);
		return {
			apiKey: typeof apiKey === 'string' && apiKey ? apiKey : null,
			insertFormat: insertFormat === 'png' ? 'png' : 'svg',
		};
	},
	setApiKey: ({ apiKey }) => figma.clientStorage.setAsync(API_KEY_STORAGE_KEY, apiKey),
	clearApiKey: () => figma.clientStorage.deleteAsync(API_KEY_STORAGE_KEY),
	setInsertFormat: ({ format }) => figma.clientStorage.setAsync(INSERT_FORMAT_STORAGE_KEY, format),
	getPlacement: async () => resolvePlacement().target,
	insertQrCode,
};

function post(message: PluginToUiMessage) {
	figma.ui.postMessage(message);
}

figma.ui.onmessage = (message: UiToPluginMessage) => {
	if (message?.type !== 'request') return;
	const handler = handlers[message.method] as (params: unknown) => Promise<unknown>;
	Promise.resolve()
		.then(() => handler(message.params))
		.then(
			(result) => post({ type: 'response', id: message.id, result }),
			(error: unknown) =>
				post({
					type: 'response',
					id: message.id,
					error: error instanceof Error ? error.message : String(error),
				}),
		);
};

const postPlacement = () => post({ type: 'placement', target: resolvePlacement().target });
figma.on('selectionchange', postPlacement);
figma.on('currentpagechange', postPlacement);
