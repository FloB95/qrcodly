import { inject, singleton } from 'tsyringe';
import { JSDOM } from 'jsdom';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { measureImageDataUrl, type TQrCodeLogo } from '@shared/schemas';
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
		const match = /^data:([^;,]+)[^,]*?(;base64)?,(.*)$/s.exec(dataUrl);
		if (!match) throw new BadRequestError('Invalid image format');
		const [, mimeType, base64, payload] = match;
		if (mimeType === 'image/png') return dataUrl;

		const buffer = base64
			? Buffer.from(payload, 'base64')
			: Buffer.from(decodeURIComponent(payload), 'utf8');

		let png: Buffer;
		try {
			if (mimeType === 'image/svg+xml') {
				png = svgToPng(buffer.toString('utf8'), systemFonts);
			} else if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
				// rotate() applies the EXIF orientation, which browsers honour and resvg ignores
				png = await sharp(buffer).rotate().png().toBuffer();
			} else {
				// other types are rejected by the upload validation
				return dataUrl;
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
		return `data:image/png;base64,${png.toString('base64')}`;
	}

	/** Logo as PNG with its size, ready for buildQrCodeSvg. Throws rather than drop the logo. */
	async toLogo(dataUrl: string): Promise<TQrCodeLogo> {
		const normalized = await this.normalize(dataUrl);
		const size = measureImageDataUrl(normalized);
		if (!size) {
			this.logger.error('error.qrCode.logo.size', {
				mimeType: /^data:([^;,]+)/.exec(normalized)?.[1],
			});
			throw new Error('Logo size could not be read');
		}
		return { dataUrl: normalized, ...size };
	}
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
