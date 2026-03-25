import QRCodeStyling, { type Options } from 'qr-code-styling';
import { JSDOM } from 'jsdom';
import { createCanvas, loadImage } from 'canvas';

const nodeCanvas = { createCanvas, loadImage };

/**
 * Generates a QR code as SVG (used for existing SVG-based flows).
 */
export function generateQrCodeStylingInstance(options: Options) {
	return new QRCodeStyling({
		jsdom: JSDOM,
		nodeCanvas: nodeCanvas as any,
		...options,
		type: 'svg',
		imageOptions: {
			...options.imageOptions,
			saveAsBlob: false,
		},
	});
}

/**
 * Generates a QR code preview as a PNG buffer using a real Canvas.
 * This renders embedded images at full quality, unlike SVG→raster conversion.
 */
export async function generateQrCodePreviewBuffer(options: Options): Promise<Buffer | undefined> {
	const instance = new QRCodeStyling({
		jsdom: JSDOM,
		nodeCanvas: nodeCanvas as any,
		...options,
		type: 'canvas',
		imageOptions: {
			...options.imageOptions,
			saveAsBlob: false,
		},
	});

	const rawData = await instance.getRawData('png');
	if (!rawData) return undefined;

	return Buffer.isBuffer(rawData) ? rawData : Buffer.from(await rawData.arrayBuffer());
}
