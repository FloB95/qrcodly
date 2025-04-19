import 'node-self';
import QRCodeStyling from 'qr-code-styling';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { Canvas } from 'skia-canvas';

// Helper to fetch and convert an image URL to a base64 Data URI
async function fetchImageAsBase64(url: string): Promise<string> {
	try {
		const response = await axios.get(url, {
			responseType: 'arraybuffer',
		});
		const contentType = response.headers['content-type'] || 'image/png';
		const base64 = Buffer.from(response.data, 'binary').toString('base64');
		return `data:${contentType};base64,${base64}`;
	} catch (error) {
		console.error('Error fetching image:', error);
		throw new Error(`Failed to fetch image: ${error.message}`);
	}
}

export async function generateQrCodeStylingInstance(options: unknown) {
	// If image is provided as a URL, convert it to base64
	if (options?.image && typeof options.image === 'string') {
		options.image = await fetchImageAsBase64(options.image);
	}

	// For svg type with the inner-image saved as a blob
	// (inner-image will render in more places but file will be larger)
	const qrCodeSvgWithBlobImage = new QRCodeStyling({
		jsdom: JSDOM, // this is required
		nodeCanvas: Canvas, // this is required
		// ...options,
		type: 'svg',
		data: options.data,
		image:
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII',
	});


	return qrCodeSvgWithBlobImage;
}
