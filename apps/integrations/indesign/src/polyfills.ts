// UXP's JS runtime ships a limited DOM and no XMLSerializer.
// qr-code-styling calls `new XMLSerializer().serializeToString(svg)` to produce
// the final SVG string, so we fill that gap with a proper recursive serializer
// that preserves attributes (including xmlns, xlink:href, and gradient refs)
// — the shortcut `outerHTML`-based polyfill used previously dropped those on
// UXP, which broke colored QR codes that rely on <defs><linearGradient>.

declare global {
	// eslint-disable-next-line no-var
	var XMLSerializer: {
		new (): { serializeToString: (node: Node) => string };
	};
}

const VOID_ELEMENTS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'source',
	'track',
	'wbr',
]);

function escapeAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serializeNode(node: Node): string {
	const TEXT_NODE = 3;
	const CDATA_NODE = 4;
	const COMMENT_NODE = 8;
	const ELEMENT_NODE = 1;

	if (node.nodeType === TEXT_NODE) {
		return escapeText(node.nodeValue ?? '');
	}
	if (node.nodeType === CDATA_NODE) {
		return `<![CDATA[${node.nodeValue ?? ''}]]>`;
	}
	if (node.nodeType === COMMENT_NODE) {
		return `<!--${node.nodeValue ?? ''}-->`;
	}
	if (node.nodeType !== ELEMENT_NODE) return '';

	const el = node as Element;
	const tag = el.tagName;
	let out = `<${tag}`;

	const attrNames = new Set<string>();
	const attrs = el.attributes;
	if (attrs) {
		for (let i = 0; i < attrs.length; i++) {
			const attr = attrs[i];
			if (!attr) continue;
			attrNames.add(attr.name);
			out += ` ${attr.name}="${escapeAttr(attr.value ?? '')}"`;
		}
	}

	// UXP's DOM can hide `xmlns` from the attributes NodeMap even though the
	// element was created via createElementNS. That strips the SVG namespace
	// from our serialized output, which then fails to place in InDesign and
	// silently breaks any QR code that references gradients / images.
	if (tag === 'svg') {
		if (!attrNames.has('xmlns')) {
			out += ' xmlns="http://www.w3.org/2000/svg"';
		}
		if (!attrNames.has('xmlns:xlink')) {
			out += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
		}
	}

	const children = el.childNodes;
	if ((!children || children.length === 0) && VOID_ELEMENTS.has(tag.toLowerCase())) {
		return out + '/>';
	}

	out += '>';
	if (children) {
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child) out += serializeNode(child);
		}
	}
	out += `</${tag}>`;
	return out;
}

if (typeof (globalThis as unknown as { XMLSerializer?: unknown }).XMLSerializer === 'undefined') {
	class MinimalXMLSerializer {
		serializeToString(node: Node): string {
			return serializeNode(node);
		}
	}
	(globalThis as unknown as { XMLSerializer: typeof MinimalXMLSerializer }).XMLSerializer =
		MinimalXMLSerializer;
}

export {};
