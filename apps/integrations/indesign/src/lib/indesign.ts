import { writeTempPngFromDataUrl } from './uxp';

declare const require: ((id: string) => unknown) | undefined;

type ScriptPreferences = { measurementUnit: unknown };
type DocumentPreferences = { pageWidth: unknown; pageHeight: unknown };

type IndesignApp = {
	activeDocument?: {
		selection: Array<{ isValid: boolean; place: (path: string) => void }>;
		placeBehavior?: { place: (path: string) => void };
		documentPreferences?: DocumentPreferences;
	};
	scriptPreferences?: ScriptPreferences;
	MeasurementUnits?: { MILLIMETERS: unknown };
	place: (path: string) => void;
};

type GetIndesignResult = { app: IndesignApp } | { error: string };

function getIndesign(): GetIndesignResult {
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
	if (candidate.app && typeof candidate.app === 'object')
		return { app: candidate.app as IndesignApp };
	if (candidate.activeDocument !== undefined) return { app: candidate as unknown as IndesignApp };

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

// Backend embeds DPI metadata so InDesign places the PNG at the requested mm.
export const PRINT_QR_PX = 4096;

const PAGE_FRACTION = 0.18;
const MIN_QR_MM = 20;
const MAX_QR_MM = 200;
const FALLBACK_QR_MM = 50;

function readPageSizeMm(app: IndesignApp): { widthMm: number; heightMm: number } | null {
	const docPrefs = app.activeDocument?.documentPreferences;
	const scriptPrefs = app.scriptPreferences;
	const mmUnit = app.MeasurementUnits?.MILLIMETERS;
	if (!docPrefs || !scriptPrefs || mmUnit === undefined) return null;

	const previousUnit = scriptPrefs.measurementUnit;
	try {
		scriptPrefs.measurementUnit = mmUnit;
		const widthMm = Number(docPrefs.pageWidth);
		const heightMm = Number(docPrefs.pageHeight);
		if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return null;
		return { widthMm, heightMm };
	} catch {
		return null;
	} finally {
		try {
			scriptPrefs.measurementUnit = previousUnit;
		} catch {
			/* ignore */
		}
	}
}

// Auto-size QR to ~18% of the active page's shorter side, clamped to a
// printable range. Falls back to FALLBACK_QR_MM if the page can't be read.
export function getAutoPlaceSizeMm(): number {
	const app = resolveApp();
	const size = readPageSizeMm(app);
	if (!size) return FALLBACK_QR_MM;
	const target = Math.min(size.widthMm, size.heightMm) * PAGE_FRACTION;
	return Math.max(MIN_QR_MM, Math.min(MAX_QR_MM, target));
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
