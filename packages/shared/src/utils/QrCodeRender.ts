import type { Options } from 'qr-code-styling';

// Every QR code image, in the browser and on the server, comes out of these three steps:
// prepareQrCodeLogo → buildQrCodeSvg → rasterizeQrCodeSvg. Both sides hand in the same resvg
// (resvg-js on the server, resvg-wasm in browsers, same version), so the pixels are identical.

/** A logo ready to be drawn: inline data URL plus the size read from the file itself. */
export type TQrCodeLogo = { dataUrl: string; width: number; height: number };

type TImageSize = { width: number; height: number };

type TResvgOptions = {
	fitTo?: { mode: 'width'; value: number } | { mode: 'height'; value: number };
	background?: string;
	font?: { loadSystemFonts: boolean };
};

type TResvg = new (
	svg: string,
	options?: TResvgOptions,
) => {
	readonly width: number;
	readonly height: number;
	render(): { asPng(): Uint8Array; free?(): void };
	// only the WASM build holds memory that has to be released by hand
	free?(): void;
};

export type TRgbaImage = { data: Uint8ClampedArray; width: number; height: number };

export type TWebpCodec = {
	decode(webp: ArrayBuffer): Promise<TRgbaImage>;
	encodePng(image: TRgbaImage): Promise<ArrayBuffer>;
};

export type TQrCodeRenderer = {
	/** `@resvg/resvg-js` on the server, `@resvg/resvg-wasm` in browsers; both exactly 2.6.2. */
	Resvg: TResvg;
	/** Reads SVG logos: the browser's own, JSDOM's on the server. */
	DOMParser: new () => DOMParser;
	XMLSerializer: new () => XMLSerializer;
	/** `@jsquash/webp` and `@jsquash/png` on both sides; loaded only when a WebP logo shows up. */
	loadWebpCodec: () => Promise<TWebpCodec>;
};

/** The logo is the user's problem (wrong format, text in an SVG); `cause` is set for our own bugs. */
export class QrCodeLogoError extends Error {
	constructor(
		message: string,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = 'QrCodeLogoError';
	}
}

// longest side of an SVG logo turned into PNG; ~2600 dpi for a 2 cm logo in print
const LOGO_MAX_PX = 2048;

/**
 * Turns any logo file into what resvg draws: PNG, JPEG and GIF as they are, SVG and WebP converted
 * to PNG. The file type comes from the bytes and the data URL is rebuilt, so the same file gives
 * the same data URL, and thereby the same SVG download, wherever it is prepared.
 */
export async function prepareQrCodeLogo(
	dataUrl: string,
	renderer: TQrCodeRenderer,
): Promise<TQrCodeLogo> {
	const parsed = parseDataUrl(dataUrl);
	if (!parsed) throw new QrCodeLogoError('Invalid image format');

	let type: TRasterType;
	let bytes: Uint8Array;
	try {
		bytes = dataUrlBytes(parsed);
		const sniffed = sniffRasterType(bytes);
		if (sniffed === 'webp') {
			[type, bytes] = ['png', await webpToPng(bytes, renderer)];
		} else if (sniffed) {
			type = sniffed;
		} else if (parsed.mimeType === 'image/svg+xml') {
			[type, bytes] = ['png', svgToPng(new TextDecoder().decode(bytes), renderer)];
		} else {
			throw new QrCodeLogoError('Unsupported logo format. Use PNG, JPEG, SVG or WebP.');
		}
	} catch (error) {
		if (error instanceof QrCodeLogoError) throw error;
		throw new QrCodeLogoError('The logo could not be read.', error);
	}

	const size = readRasterSize(type, bytes);
	if (!size) throw new QrCodeLogoError('The logo could not be read.');
	return { dataUrl: `data:image/${type};base64,${toBase64(bytes)}`, ...size };
}

/** The QR code as PNG, `width` pixels wide (the SVG's own size if not given). */
export function rasterizeQrCodeSvg(
	svg: string,
	renderer: Pick<TQrCodeRenderer, 'Resvg'>,
	width?: number,
): Uint8Array {
	return drawPng(renderer.Resvg, svg, {
		...(width ? { fitTo: { mode: 'width', value: width } } : {}),
		background: 'rgba(0,0,0,0)',
		font: { loadSystemFonts: false },
	});
}

function drawPng(Resvg: TResvg, svg: string, options: TResvgOptions): Uint8Array {
	const resvg = new Resvg(svg, options);
	try {
		const image = resvg.render();
		try {
			return image.asPng();
		} finally {
			image.free?.();
		}
	} finally {
		resvg.free?.();
	}
}

function svgToPng(svg: string, renderer: TQrCodeRenderer): Uint8Array {
	// parsed as XML (not pattern-matched), so every spelling of a reference is caught
	const document = new renderer.DOMParser().parseFromString(svg, 'image/svg+xml');
	if (document.getElementsByTagName('parsererror').length > 0) {
		throw new QrCodeLogoError('The SVG logo is not valid SVG.');
	}

	// resvg draws without fonts everywhere, so text would vanish
	if (document.querySelector('text')) {
		throw new QrCodeLogoError(
			'SVG logos with text are not supported here. Convert the text to paths or upload a PNG.',
		);
	}

	// the parser has expanded all entities already; dropping the DOCTYPE stops resvg re-expanding them
	document.doctype?.remove();
	// resvg-js loads href paths from the server disk, so only inline data and in-document references stay
	for (const element of Array.from(document.querySelectorAll('*'))) {
		for (const attribute of Array.from(element.attributes)) {
			const value = attribute.value;
			if (attribute.localName === 'href' && !value.startsWith('data:') && !value.startsWith('#')) {
				element.removeAttributeNode(attribute);
			}
		}
	}

	const cleaned = new renderer.XMLSerializer().serializeToString(document);
	const font = { loadSystemFonts: false };
	const probe = new renderer.Resvg(cleaned, { font });
	const { width, height } = probe;
	probe.free?.();
	const mode = width >= height ? 'width' : 'height';
	return drawPng(renderer.Resvg, cleaned, { font, fitTo: { mode, value: LOGO_MAX_PX } });
}

async function webpToPng(bytes: Uint8Array, renderer: TQrCodeRenderer): Promise<Uint8Array> {
	const codec = await renderer.loadWebpCodec();
	// decoded unpremultiplied, so transparent edges keep their colors (a canvas would not)
	const image = await codec.decode(
		bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
	);
	return new Uint8Array(await codec.encodePng(image));
}

function dataUrlBytes({ base64, payload }: { base64: boolean; payload: string }): Uint8Array {
	return base64
		? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
		: new TextEncoder().encode(decodeURIComponent(payload));
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	// in chunks: one call per byte is slow, all bytes at once overflows the call stack
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

type TRasterType = 'png' | 'jpeg' | 'gif';

function sniffRasterType(bytes: Uint8Array): TRasterType | 'webp' | undefined {
	const b = byteReader(bytes);
	const tag = (i: number) => String.fromCharCode(b(i), b(i + 1), b(i + 2), b(i + 3));
	if (tag(0) === '\x89PNG') return 'png';
	if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'jpeg';
	if (tag(0) === 'GIF8') return 'gif';
	if (tag(0) === 'RIFF' && tag(8) === 'WEBP') return 'webp';
	return undefined;
}

function readRasterSize(type: TRasterType, bytes: Uint8Array): TImageSize | undefined {
	const size =
		type === 'png'
			? readPngSize(bytes)
			: type === 'jpeg'
				? readJpegSize(bytes)
				: readGifSize(bytes);
	return size && size.width > 0 && size.height > 0 ? size : undefined;
}

/**
 * Builds the QR code SVG with qr-code-styling; `options.image` is ignored in favour of `logo`.
 * The server passes `jsdom` (no DOM).
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

/**
 * Splits a data URL by plain string search. A regex here would backtrack on hostile input (up to
 * minutes for a 1 MB string), and logos arrive from anonymous requests.
 */
export function parseDataUrl(
	dataUrl: string,
): { mimeType: string; base64: boolean; payload: string } | undefined {
	if (!dataUrl.startsWith('data:')) return undefined;
	const comma = dataUrl.indexOf(',');
	if (comma === -1) return undefined;
	const header = dataUrl.slice('data:'.length, comma);
	const mimeType = header.split(';', 1)[0] ?? '';
	if (!mimeType) return undefined;
	return { mimeType, base64: header.endsWith(';base64'), payload: dataUrl.slice(comma + 1) };
}

/** Size of a PNG, JPEG, GIF, WebP or SVG data URL, read from the file bytes; undefined if unknown. */
export function measureImageDataUrl(dataUrl: string): TImageSize | undefined {
	const parsed = parseDataUrl(dataUrl);
	if (!parsed) return undefined;
	const bytes = dataUrlBytes(parsed);

	switch (parsed.mimeType) {
		case 'image/svg+xml':
			return readSvgSize(new TextDecoder().decode(bytes));
		case 'image/png':
			return readPngSize(bytes);
		case 'image/jpeg':
			return readJpegSize(bytes);
		case 'image/gif':
			return readGifSize(bytes);
		case 'image/webp':
			return readWebpSize(bytes);
		default:
			return undefined;
	}
}

function readSvgSize(svg: string): TImageSize | undefined {
	// found by search, not by one regex: `<svg\b[^>]*>` rescans to the end for every unclosed `<svg`
	const start = svg.search(/<svg\b/i);
	const end = start === -1 ? -1 : svg.indexOf('>', start);
	if (end === -1) return undefined;
	const tag = svg.slice(start, end + 1);
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

function readGifSize(bytes: Uint8Array): TImageSize | undefined {
	const b = byteReader(bytes);
	if (bytes.length < 10 || b(0) !== 0x47 || b(1) !== 0x49 || b(2) !== 0x46) return undefined;
	return { width: b(6) | (b(7) << 8), height: b(8) | (b(9) << 8) };
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
