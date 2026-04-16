import { writeTempSvg, writeTempPngFromDataUrl } from './uxp';
import { sanitizeQrSvg } from './svg-sanitize';

type IndesignApp = {
	activeDocument?: {
		selection: Array<{ isValid: boolean; place: (path: string) => void }>;
		placeBehavior?: { place: (path: string) => void };
		pages: { itemByRange: (start: number, end: number) => unknown };
	};
	place: (path: string) => void;
};

function getIndesign(): { app: IndesignApp } | null {
	const req = (globalThis as unknown as { require?: (id: string) => unknown }).require;
	if (!req) return null;

	const candidates: Array<() => { app: IndesignApp } | null> = [
		() => {
			const mod = req('indesign') as { app?: IndesignApp } | IndesignApp | null;
			if (!mod) return null;
			if ('app' in (mod as object) && (mod as { app?: IndesignApp }).app) {
				return { app: (mod as { app: IndesignApp }).app };
			}
			if ('activeDocument' in (mod as object)) return { app: mod as IndesignApp };
			return null;
		},
		() => {
			try {
				const app = req('indesign.app') as IndesignApp | null;
				return app ? { app } : null;
			} catch {
				return null;
			}
		},
		() => {
			try {
				const app = req('app') as IndesignApp | null;
				return app ? { app } : null;
			} catch {
				return null;
			}
		},
	];

	for (const attempt of candidates) {
		try {
			const result = attempt();
			if (result && result.app) return result;
		} catch {
			// try next resolver
		}
	}
	return null;
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
	const indesign = getIndesign();
	if (!indesign) throw new Error('InDesign DOM not available');

	const normalized = normalizeSvgDimensions(sanitizeQrSvg(svg));
	const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
	const nativePath = await writeTempSvg(filename, normalized);

	const app = indesign.app;
	if (!app) throw new Error('InDesign app object unavailable');
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
	const indesign = getIndesign();
	if (!indesign) throw new Error('InDesign DOM not available');

	const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
	const nativePath = await writeTempPngFromDataUrl(filename, pngDataUrl);

	const app = indesign.app;
	if (!app) throw new Error('InDesign app object unavailable');
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
