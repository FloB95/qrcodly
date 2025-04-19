import 'node-self';
import QRCodeStyling, { type Options } from 'qr-code-styling';
import { JSDOM } from 'jsdom';

export function generateQrCodeStylingInstance(options: Options) {
	// For svg type with the inner-image saved as a blob
	// (inner-image will render in more places but file will be larger)
	const qrCodeSvgWithBlobImage = new QRCodeStyling({
		jsdom: JSDOM, // this is required
		...options,
		type: 'svg',
	});

	return qrCodeSvgWithBlobImage;
}
