import { inject, singleton } from 'tsyringe';
import {
	parseDataUrl,
	prepareQrCodeLogo,
	QrCodeLogoError,
	type TQrCodeLogo,
} from '@shared/schemas';
import { BadRequestError } from '@/core/error/http';
import { Logger } from '@/core/logging';
import { qrCodeRenderer } from '@/modules/qr-code/lib/styled-qr-code';

/**
 * Logos go through the same preparation as in the browser (SVG and WebP become PNG), so both draw
 * the same pixels. The editor already sends PNG; this covers API uploads and old stored files.
 */
@singleton()
export class QrCodeLogoService {
	constructor(@inject(Logger) private readonly logger: Logger) {}

	/** Stored as it will be drawn, so every later render starts from the same file. */
	async normalize(dataUrl: string): Promise<string> {
		return (await this.toLogo(dataUrl)).dataUrl;
	}

	/** Logo with its size, ready for buildQrCodeSvg. Throws rather than drop the logo. */
	async toLogo(dataUrl: string): Promise<TQrCodeLogo> {
		try {
			return await prepareQrCodeLogo(dataUrl, qrCodeRenderer);
		} catch (error) {
			if (!(error instanceof QrCodeLogoError)) throw error;
			const mimeType = parseDataUrl(dataUrl)?.mimeType;
			if (error.cause) {
				this.logger.error('error.qrCode.logo.convert', { mimeType, error: error.cause as Error });
			} else {
				this.logger.warn('qrCode.logo.rejected', { mimeType, reason: error.message });
			}
			throw new BadRequestError(error.message);
		}
	}
}
