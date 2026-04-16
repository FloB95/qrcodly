import QRCodeStyling from 'qr-code-styling';
import type { TQrCode, TQrCodeContent } from '@shared/schemas';

type QrCodeLike = Pick<TQrCode, 'config' | 'content'> & {
	previewImage?: string | null;
	shortUrl?: { shortCode: string } | null;
};

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error('FileReader failed'));
		reader.readAsDataURL(blob);
	});
}

function contentToPayload(content: TQrCodeContent, fallbackShortCode?: string): string {
	if (fallbackShortCode) return `https://qrcodly.de/u/${fallbackShortCode}`;
	switch (content.type) {
		case 'url':
			return content.data.url;
		case 'text':
			return content.data;
		default:
			return JSON.stringify(content.data);
	}
}

const RENDER_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
		),
	]);
}

/**
 * Renders a QR config via qr-code-styling on a canvas and returns a PNG data
 * URL. UXP's SVG renderer is unreliable (clip-path refs flood to black), so
 * we go straight to raster.
 */
export async function renderConfigToPngDataUrl(
	config: object,
	data: string,
	sizePx = 512,
): Promise<string> {
	const { image: _drop, ...rest } = config as { image?: string | null };
	void _drop;

	const styling = new QRCodeStyling({
		...rest,
		data,
		type: 'canvas',
		width: sizePx,
		height: sizePx,
	});

	const raw = await withTimeout(styling.getRawData('png'), RENDER_TIMEOUT_MS, 'qr-code-styling');
	if (!raw) throw new Error('qr-code-styling returned no data');
	if (!(raw instanceof Blob)) {
		throw new Error('qr-code-styling returned unexpected data type');
	}
	return await blobToDataUrl(raw);
}

export async function renderQrCodeToPngDataUrl(qr: QrCodeLike): Promise<string> {
	const payload = contentToPayload(qr.content, qr.shortUrl?.shortCode);
	return renderConfigToPngDataUrl(qr.config as object, payload);
}
