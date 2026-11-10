import { type Options } from 'qr-code-styling';
import { JSDOM } from 'jsdom';
import { buildQrCodeSvg, type TQrCodeLogo } from '@shared/schemas';

/** Server-side entry to the shared QR builder; JSDOM stands in for the browser DOM. */
export function renderQrCodeSvg(options: Options, logo: TQrCodeLogo | undefined): Promise<string> {
	return buildQrCodeSvg(options, logo, JSDOM);
}
