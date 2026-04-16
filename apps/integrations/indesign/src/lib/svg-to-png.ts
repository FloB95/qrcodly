/**
 * Rasterizes an SVG string to a PNG data URL via a hidden <canvas>.
 *
 * Needed because UXP's panel renderer does not honour SVG <clipPath>
 * references correctly — qr-code-styling output floods black as a result.
 * The browser engine does handle clipPath when drawing an Image onto a
 * canvas, so routing the SVG through drawImage + canvas.toDataURL produces
 * a faithful bitmap that displays reliably via <img>.
 */
export async function svgStringToPngDataUrl(svg: string, size = 400): Promise<string> {
	const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

	const img = await new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = (event) => reject(event);
		image.src = svgDataUrl;
	});

	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('canvas 2d context unavailable');
	ctx.drawImage(img, 0, 0, size, size);

	return canvas.toDataURL('image/png');
}
