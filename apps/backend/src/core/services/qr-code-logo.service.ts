import { inject, singleton } from 'tsyringe';
import { JSDOM } from 'jsdom';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { measureImageDataUrl, parseDataUrl, type TQrCodeLogo } from '@shared/schemas';
import { BadRequestError } from '@/core/error/http';
import { Logger } from '@/core/logging';

// longest side of an SVG logo turned into PNG; ~2600 dpi for a 2 cm logo in print
const LOGO_MAX_PX = 2048;

/**
 * Every logo is stored and drawn as PNG, so browser, resvg and print tools show the same pixels.
 * The editor converts in the browser (with the user's fonts); this covers API uploads and old files.
 */
@singleton()
export class QrCodeLogoService {
	constructor(@inject(Logger) private readonly logger: Logger) {}

	/** `systemFonts` only for one-off runs on a machine that has fonts; the server has none. */
	async normalize(dataUrl: string, { systemFonts = false } = {}): Promise<string> {
		const parsed = parseDataUrl(dataUrl);
		if (!parsed) throw new BadRequestError('Invalid image format');
		const { mimeType, base64, payload } = parsed;
		const isRaster = RASTER_TYPES.includes(mimeType);
		// other types are rejected by the upload validation
		if (!isRaster && mimeType !== 'image/svg+xml') return dataUrl;

		const buffer = base64
			? Buffer.from(payload, 'base64')
			: Buffer.from(decodeURIComponent(payload), 'utf8');

		let png: Buffer;
		try {
			if (!isRaster) {
				png = svgToPng(buffer.toString('utf8'), systemFonts);
			} else {
				// the declared type is only a label: a renamed .jpg arrives as image/png
				const actualType = detectRasterType(buffer);
				if (!actualType) throw new BadRequestError('The logo could not be read.');
				if (actualType === 'image/png') {
					return mimeType === 'image/png' && base64 ? dataUrl : toPngDataUrl(buffer);
				}
				// only bytes recognised as JPEG or WebP reach sharp, never its other decoders;
				// rotate() applies the EXIF orientation, which browsers honour and resvg ignores
				png = await sharp(buffer).rotate().png().toBuffer();
			}
		} catch (error) {
			if (error instanceof BadRequestError) {
				this.logger.warn('qrCode.logo.rejected', { mimeType, reason: error.message });
				throw error;
			}
			this.logger.error('error.qrCode.logo.convert', {
				mimeType,
				bytes: buffer.length,
				error: error as Error,
			});
			throw new BadRequestError('The logo could not be read.');
		}
		return toPngDataUrl(png);
	}

	/** Logo as PNG with its size, ready for buildQrCodeSvg. Throws rather than drop the logo. */
	async toLogo(dataUrl: string): Promise<TQrCodeLogo> {
		const normalized = await this.normalize(dataUrl);
		const size = measureImageDataUrl(normalized);
		if (!size) {
			this.logger.error('error.qrCode.logo.size', {
				mimeType: parseDataUrl(normalized)?.mimeType,
			});
			throw new Error('Logo size could not be read');
		}
		return { dataUrl: normalized, ...size };
	}
}

const RASTER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const toPngDataUrl = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;

function detectRasterType(bytes: Buffer): string | undefined {
	if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
	if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
		return 'image/webp';
	}
	return undefined;
}

function svgToPng(svg: string, systemFonts: boolean): Buffer {
	// parsed as XML (not pattern-matched), so every spelling of a reference is caught
	const { document, XMLSerializer } = new JSDOM(svg, { contentType: 'image/svg+xml' }).window;

	// the server has no fonts on purpose: text would look different there or vanish
	if (!systemFonts && document.querySelector('text')) {
		throw new BadRequestError(
			'SVG logos with text are not supported here. Convert the text to paths or upload a PNG.',
		);
	}

	// the parser has expanded all entities already; dropping the DOCTYPE stops resvg re-expanding them
	document.doctype?.remove();
	// resvg loads href paths from the server disk, so only inline data and in-document references stay
	for (const element of document.querySelectorAll('*')) {
		for (const attribute of [...element.attributes]) {
			const value = attribute.value;
			if (attribute.localName === 'href' && !value.startsWith('data:') && !value.startsWith('#')) {
				element.removeAttributeNode(attribute);
			}
		}
	}

	const cleaned = new XMLSerializer().serializeToString(document);
	const options = {
		font: systemFonts
			? { loadSystemFonts: true, defaultFontFamily: 'Arial' }
			: { loadSystemFonts: false },
	};
	const { width, height } = new Resvg(cleaned, options);
	const fitTo = { mode: width >= height ? 'width' : 'height', value: LOGO_MAX_PX } as const;
	return Buffer.from(new Resvg(cleaned, { ...options, fitTo }).render().asPng());
}
