import QRCodeStyling, { type Options } from 'qr-code-styling';
import { JSDOM } from 'jsdom';

// Minimal nodeCanvas implementation for server-side image loading.
// JSDOM's Image element never fires onload (it can't decode images),
// which causes qr-code-styling's loadImage() promise to hang forever.
// Providing nodeCanvas.loadImage makes the library use this path instead.
const nodeCanvas = {
	loadImage: (src: string) => Promise.resolve({ width: 100, height: 100, src } as any),
	createCanvas: () => null,
};

export function generateQrCodeStylingInstance(options: Options) {
	return new QRCodeStyling({
		jsdom: JSDOM,
		nodeCanvas: nodeCanvas as any,
		...options,
		type: 'svg',
		// Disable saveAsBlob for server-side rendering. When enabled, qr-code-styling
		// uses JSDOM's XMLHttpRequest with responseType="blob" which JSDOM doesn't support.
		imageOptions: {
			...options.imageOptions,
			saveAsBlob: false,
		},
	});
}
