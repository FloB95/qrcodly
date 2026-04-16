/**
 * Patches a QR-styling SVG so InDesign's (and UXP's) quirky renderer can
 * display it with the intended colors.
 *
 * Known pitfalls we correct for:
 * 1. `currentColor` is interpreted as black in InDesign. We replace it with
 *    explicit `#000`.
 * 2. A full-canvas background <rect width="100%" height="100%"> floods the
 *    whole area; drop it.
 * 3. Inline <style> blocks sometimes carry CSS that InDesign cannot parse,
 *    turning paths black. We strip them when the SVG also references gradients
 *    directly on attributes — safe to remove in QR output.
 */
export function sanitizeQrSvg(raw: string): string {
	let svg = raw;

	// 1. Drop the `<?xml ... ?>` prolog — it isn't valid HTML and tripping up
	//    innerHTML parsing on UXP leaves us with a blank preview.
	svg = svg.replace(/^\s*<\?xml[^?]*\?>\s*/i, '');

	// 2. currentColor → explicit black. InDesign treats currentColor as black
	//    anyway, so making it explicit avoids edge-case parser behaviour.
	svg = svg.replace(/currentColor/g, '#000000');

	// 3. Drop ONLY the obvious full-canvas background fills (width & height
	//    literally 100%). qr-code-styling-style output does NOT use this form
	//    — the real visible white/black rects are clip-path-scoped and must
	//    stay intact, so we deliberately leave `<rect x="0" y="0" width="N"
	//    height="N">` alone.
	svg = svg.replace(/<rect\b[^>]*\bwidth="100%"[^>]*\bheight="100%"[^>]*\/?>/gi, '');
	svg = svg.replace(/<rect\b[^>]*\bheight="100%"[^>]*\bwidth="100%"[^>]*\/?>/gi, '');

	return svg;
}
