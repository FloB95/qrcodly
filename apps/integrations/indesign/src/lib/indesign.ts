import { writeTempSvg, writeTempPngFromDataUrl } from './uxp';
import { sanitizeQrSvg } from './svg-sanitize';

// UXP injects `require` into the module scope as a host-level CommonJS loader.
// Declaring it locally (plus the `indesign` external in webpack.config) keeps
// the call literal so webpack does not try to resolve it from node_modules.
declare const require: ((id: string) => unknown) | undefined;

type IndesignApp = {
	activeDocument?: {
		selection: Array<{ isValid: boolean; place: (path: string) => void }>;
		placeBehavior?: { place: (path: string) => void };
		pages: { itemByRange: (start: number, end: number) => unknown };
	};
	place: (path: string) => void;
};

type GetIndesignResult = { app: IndesignApp } | { error: string };

function getIndesign(): GetIndesignResult {
	// Prefer the module-scope `require` that webpack preserves through the
	// `indesign` external; fall back to `globalThis.require` for older UXP
	// builds where the global is populated but the injected local is not.
	const req: ((id: string) => unknown) | undefined =
		typeof require === 'function'
			? require
			: (globalThis as unknown as { require?: (id: string) => unknown }).require;

	if (typeof req !== 'function') {
		return { error: 'UXP require() is not available in this runtime' };
	}

	let mod: unknown;
	try {
		mod = req('indesign');
	} catch (err) {
		return {
			error: `require("indesign") threw: ${err instanceof Error ? err.message : String(err)}`,
		};
	}

	if (!mod || typeof mod !== 'object') {
		return { error: `require("indesign") returned ${mod === null ? 'null' : typeof mod}` };
	}

	const candidate = mod as { app?: unknown; activeDocument?: unknown };

	if (candidate.app && typeof candidate.app === 'object') {
		return { app: candidate.app as IndesignApp };
	}
	if (candidate.activeDocument !== undefined) {
		return { app: candidate as unknown as IndesignApp };
	}

	return {
		error: `InDesign module has no .app and no .activeDocument (keys: ${Object.keys(candidate)
			.slice(0, 8)
			.join(',')})`,
	};
}

function resolveApp(): IndesignApp {
	const result = getIndesign();
	if ('error' in result) throw new Error(`InDesign DOM not available — ${result.error}`);
	return result.app;
}

/**
 * InDesign's click-to-place reads the SVG's intrinsic width/height attributes.
 * qr-code-styling emits those as unit-less pixel counts (e.g. 300), which
 * InDesign interprets as points → ~10cm, far too large for a typical print QR.
 *
 * We rewrite the root <svg> to a sensible print default (30×30 mm) while
 * preserving the viewBox so the vector stays crisp at any rescale.
 */
const DEFAULT_QR_PRINT_SIZE_MM = 30;

function normalizeSvgDimensions(svg: string, sizeMm = DEFAULT_QR_PRINT_SIZE_MM): string {
	let normalized = svg
		.replace(/<svg\b([^>]*?)\s+width="[^"]*"/i, '<svg$1')
		.replace(/<svg\b([^>]*?)\s+height="[^"]*"/i, '<svg$1');
	normalized = normalized.replace(
		/<svg\b([^>]*)>/i,
		`<svg$1 width="${sizeMm}mm" height="${sizeMm}mm">`,
	);
	return normalized;
}

export async function placeSvgInActiveDocument(svg: string, name: string): Promise<void> {
	const app = resolveApp();

	const normalized = normalizeSvgDimensions(sanitizeQrSvg(svg));
	const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
	const nativePath = await writeTempSvg(filename, normalized);

	const doc = app.activeDocument;
	if (!doc) throw new Error('Open a document in InDesign first.');

	if (doc.selection.length === 1 && doc.selection[0]?.isValid) {
		doc.selection[0].place(nativePath);
		return;
	}
	if (doc.placeBehavior?.place) {
		doc.placeBehavior.place(nativePath);
		return;
	}
	app.place(nativePath);
}

export async function placePngInActiveDocument(pngDataUrl: string, name: string): Promise<void> {
	const app = resolveApp();

	const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
	const nativePath = await writeTempPngFromDataUrl(filename, pngDataUrl);

	const doc = app.activeDocument;
	if (!doc) throw new Error('Open a document in InDesign first.');

	if (doc.selection.length === 1 && doc.selection[0]?.isValid) {
		doc.selection[0].place(nativePath);
		return;
	}
	if (doc.placeBehavior?.place) {
		doc.placeBehavior.place(nativePath);
		return;
	}
	app.place(nativePath);
}
