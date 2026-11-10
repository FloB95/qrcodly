import type { Options } from 'qr-code-styling';

/** A logo ready to be drawn: inline data URL plus the size read from the file itself. */
export type TQrCodeLogo = { dataUrl: string; width: number; height: number };

type TImageSize = { width: number; height: number };

/**
 * The single place that turns QR code options into an image. Browser and backend both call it, so
 * every preview, download and plugin export is the same SVG. The backend passes `jsdom` (no DOM).
 */
export async function buildQrCodeSvg(
	options: Options,
	logo: TQrCodeLogo | undefined,
	jsdom?: Options['jsdom'],
): Promise<string> {
	// imported lazily: the library touches the DOM on load, which breaks server-side rendering
	const { default: QRCodeStyling } = await import('qr-code-styling');

	const instance = new QRCodeStyling({
		...options,
		type: 'svg',
		image: logo?.dataUrl,
		jsdom,
		// logo placement depends on its size, so it comes from the file, not from how a browser
		// or JSDOM happens to measure it
		nodeCanvas: {
			loadImage: async () => ({ width: logo?.width ?? 0, height: logo?.height ?? 0 }),
			createCanvas: () => null,
		} as unknown as Options['nodeCanvas'],
		imageOptions: { ...options.imageOptions, saveAsBlob: false },
	});

	const raw = await instance.getRawData('svg');
	if (!raw) throw new Error('qr-code-styling returned no SVG');
	const svg = raw instanceof Uint8Array ? new TextDecoder().decode(raw) : await raw.text();

	// resvg and print tools only resolve url(#id) without quotes
	return svg.replace(/url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g, 'url(#$1)');
}

/** Size of a PNG, JPEG, WebP or SVG data URL, read from the file bytes; undefined if unknown. */
export function measureImageDataUrl(dataUrl: string): TImageSize | undefined {
	const match = /^data:([^;,]+)[^,]*?(;base64)?,(.*)$/s.exec(dataUrl);
	if (!match) return undefined;
	const [, mimeType, base64, payload = ''] = match;
	const bytes = base64
		? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
		: new TextEncoder().encode(decodeURIComponent(payload));

	switch (mimeType) {
		case 'image/svg+xml':
			return readSvgSize(new TextDecoder().decode(bytes));
		case 'image/png':
			return readPngSize(bytes);
		case 'image/jpeg':
			return readJpegSize(bytes);
		case 'image/webp':
			return readWebpSize(bytes);
		default:
			return undefined;
	}
}

function readSvgSize(svg: string): TImageSize | undefined {
	const tag = /<svg\b[^>]*>/i.exec(svg)?.[0];
	if (!tag) return undefined;
	const attr = (name: string) =>
		new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag)?.[1];
	// percentages and units other than px cannot be resolved without a layout
	const length = (value?: string) =>
		value && /^\s*[\d.]+\s*(px)?\s*$/.test(value) ? parseFloat(value) : undefined;

	const [, , boxWidth, boxHeight] =
		attr('viewBox')
			?.trim()
			.split(/[\s,]+/)
			.map(Number) ?? [];
	const width = length(attr('width'));
	const height = length(attr('height'));

	if (width && height) return { width, height };
	if (boxWidth && boxHeight) {
		if (width) return { width, height: (width * boxHeight) / boxWidth };
		if (height) return { width: (height * boxWidth) / boxHeight, height };
		return { width: boxWidth, height: boxHeight };
	}
	return undefined;
}

// bytes past the end read as 0; every reader checks the length or signature first
const byteReader = (bytes: Uint8Array) => (i: number) => bytes[i] ?? 0;

function readPngSize(bytes: Uint8Array): TImageSize | undefined {
	const b = byteReader(bytes);
	if (bytes.length < 24 || b(0) !== 0x89 || b(1) !== 0x50) return undefined;
	const u32 = (i: number) => ((b(i) << 24) | (b(i + 1) << 16) | (b(i + 2) << 8) | b(i + 3)) >>> 0;
	return { width: u32(16), height: u32(20) };
}

function readJpegSize(bytes: Uint8Array): TImageSize | undefined {
	const b = byteReader(bytes);
	if (b(0) !== 0xff || b(1) !== 0xd8) return undefined;
	let i = 2;
	while (i + 9 < bytes.length) {
		if (b(i) !== 0xff) return undefined;
		const marker = b(i + 1);
		// start-of-frame markers carry the size (C4, C8 and CC are other segments)
		if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
			return { width: (b(i + 7) << 8) | b(i + 8), height: (b(i + 5) << 8) | b(i + 6) };
		}
		i += 2 + ((b(i + 2) << 8) | b(i + 3));
	}
	return undefined;
}

function readWebpSize(bytes: Uint8Array): TImageSize | undefined {
	const b = byteReader(bytes);
	const tag = (i: number) => String.fromCharCode(b(i), b(i + 1), b(i + 2), b(i + 3));
	if (bytes.length < 30 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return undefined;
	switch (tag(12)) {
		case 'VP8 ':
			return { width: ((b(27) << 8) | b(26)) & 0x3fff, height: ((b(29) << 8) | b(28)) & 0x3fff };
		case 'VP8L':
			return {
				width: 1 + (((b(22) & 0x3f) << 8) | b(21)),
				height: 1 + (((b(24) & 0x0f) << 10) | (b(23) << 2) | ((b(22) & 0xc0) >> 6)),
			};
		case 'VP8X':
			return {
				width: 1 + (b(24) | (b(25) << 8) | (b(26) << 16)),
				height: 1 + (b(27) | (b(28) << 8) | (b(29) << 16)),
			};
		default:
			return undefined;
	}
}
