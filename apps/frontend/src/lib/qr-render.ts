import type { Options } from 'qr-code-styling';
import * as Sentry from '@sentry/nextjs';
import {
	buildQrCodeSvg,
	measureImageDataUrl,
	prepareQrCodeLogo,
	rasterizeQrCodeSvg,
	type TFileExtension,
	type TQrCodeLogo,
	type TQrCodeRenderer,
	type TWebpCodec,
} from '@shared/schemas';
import { fetchImageAsBase64 } from '@/lib/utils';
import { loadWasm } from '@/lib/qr-render-wasm';

// Every QR image in the browser comes from here, through the same pipeline as on the server
// (packages/shared QrCodeRender.ts) with the same resvg build, compiled to WASM. Previews, downloads
// and exports are therefore pixel for pixel what the API, the dashboard and the design plugins get.

// a failure here means a customer gets no QR code or a wrong one, so every one goes to Sentry
function reportRenderError(error: unknown, stage: 'svg' | 'raster' | 'logo', image?: string) {
	Sentry.captureException(error, {
		tags: { area: 'qr-render', stage },
		// only the logo's type or address, never its content
		extra: { logo: !image ? 'none' : image.startsWith('data:') ? image.split(';')[0] : image },
	});
}

async function createRenderer(): Promise<TQrCodeRenderer> {
	const [{ Resvg, initWasm }, wasm] = await Promise.all([
		import('@resvg/resvg-wasm'),
		loadWasm('resvg'),
	]);
	// resvg-wasm can be set up once per page; after a hot reload in development it already is
	await initWasm(wasm).catch((error: unknown) => {
		if (!String(error).includes('Already initialized')) throw error;
	});
	return { Resvg, DOMParser, XMLSerializer, loadWebpCodec };
}

async function createWebpCodec(): Promise<TWebpCodec> {
	const [webp, png, webpWasm, pngWasm] = await Promise.all([
		import('@jsquash/webp/decode.js'),
		import('@jsquash/png/encode.js'),
		loadWasm('webpDecoder'),
		loadWasm('pngEncoder'),
	]);
	await Promise.all([webp.init(webpWasm), png.init(pngWasm)]);
	return {
		decode: (data) => webp.default(data),
		encodePng: (image) => png.default(image as ImageData),
	};
}

/** Retried on the next call if it failed, e.g. because the network dropped. */
function once<T>(create: () => Promise<T>): () => Promise<T> {
	let promise: Promise<T> | undefined;
	return () => {
		promise ??= create().catch((error: unknown) => {
			promise = undefined;
			throw error;
		});
		return promise;
	};
}

const loadWebpCodec = once(createWebpCodec);
const loadRenderer = once(createRenderer);

// logos are prepared once per page view, not for every preview update or exported file
const logos = new Map<string, Promise<TQrCodeLogo>>();
const LOGO_CACHE_SIZE = 20;

function loadLogo(image: string, renderer: TQrCodeRenderer): Promise<TQrCodeLogo> {
	let logo = logos.get(image);
	if (!logo) {
		logo = (async () =>
			prepareQrCodeLogo(
				image.startsWith('data:') ? image : await fetchImageAsBase64(image),
				renderer,
			))();
		logos.set(image, logo);
		logo.catch(() => logos.delete(image));
		// the oldest entry goes first; Map keeps insertion order
		if (logos.size > LOGO_CACHE_SIZE) logos.delete(logos.keys().next().value!);
	}
	return logo;
}

async function render(options: Options): Promise<{ svg: string; renderer: TQrCodeRenderer }> {
	const renderer = await loadRenderer();
	let logo: TQrCodeLogo | undefined;
	try {
		logo = options.image ? await loadLogo(options.image, renderer) : undefined;
	} catch (error) {
		reportRenderError(error, 'logo', options.image);
		throw error;
	}
	try {
		return { svg: await buildQrCodeSvg(options, logo), renderer };
	} catch (error) {
		reportRenderError(error, 'svg', options.image);
		throw error;
	}
}

/** The SVG file, byte for byte the one the API returns. */
export async function renderQrCodeSvg(options: Options): Promise<string> {
	return (await render(options)).svg;
}

/** The PNG at the code's own size, as shown in the preview and downloaded. */
export async function renderQrCodePng(options: Options): Promise<Blob> {
	const { svg, renderer } = await render(options);
	try {
		const png = rasterizeQrCodeSvg(svg, renderer, options.width);
		return new Blob([png as Uint8Array<ArrayBuffer>], { type: 'image/png' });
	} catch (error) {
		reportRenderError(error, 'raster', options.image);
		throw error;
	}
}

export async function renderQrCodeBlob(options: Options, extension: TFileExtension): Promise<Blob> {
	if (extension === 'svg') {
		return new Blob([await renderQrCodeSvg(options)], { type: 'image/svg+xml' });
	}
	const png = await renderQrCodePng(options);
	if (extension === 'png') return png;

	try {
		const image = await createImageBitmap(png);
		const canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Canvas is not available');
		// JPEG has no transparency: white like the API's JPEGs, where a canvas would make it black
		if (extension === 'jpeg') {
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		context.drawImage(image, 0, 0);
		image.close();

		return await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
				`image/${extension}`,
				1,
			),
		);
	} catch (error) {
		reportRenderError(error, 'raster', options.image);
		throw error;
	}
}

export async function downloadQrCode(options: Options, name: string, extension: TFileExtension) {
	const url = URL.createObjectURL(await renderQrCodeBlob(options, extension));
	const link = document.createElement('a');
	link.href = url;
	link.download = `${name}.${extension}`;
	link.click();
	// the browser needs the URL until the download has started
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function loadImage(src: string): Promise<HTMLImageElement> {
	const image = new Image();
	return new Promise((resolve, reject) => {
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('Image could not be drawn'));
		image.src = src;
	});
}

// longest side of a vector logo turned into PNG; ~2600 dpi for a 2 cm logo in print
const LOGO_MAX_PX = 2048;
// same limit the API enforces for logos
const LOGO_MAX_BYTES = 1024 * 1024;

export class LogoTooLargeError extends Error {}

/**
 * Turns a picked logo into a PNG once, drawn by this browser with the user's fonts. From then on
 * the file holds only pixels, so every renderer and print tool shows exactly what was seen here.
 */
export async function prepareLogo(dataUrl: string): Promise<string> {
	if (dataUrl.startsWith('data:image/png')) return dataUrl;
	try {
		return await convertLogoToPng(dataUrl);
	} catch (error) {
		// too large is the user's file, everything else is ours to look at
		if (!(error instanceof LogoTooLargeError)) reportRenderError(error, 'logo', dataUrl);
		throw error;
	}
}

async function convertLogoToPng(dataUrl: string): Promise<string> {
	const canvas = document.createElement('canvas');
	let image: HTMLImageElement;

	if (dataUrl.startsWith('data:image/svg+xml')) {
		const size = measureImageDataUrl(dataUrl);
		if (!size) throw new Error('SVG logo has no size');
		// vector logos are drawn at full print size
		const scale = LOGO_MAX_PX / Math.max(size.width, size.height);
		canvas.width = Math.round(size.width * scale);
		canvas.height = Math.round(size.height * scale);
		image = await loadImage(svgToDataUrl(withPixelSize(dataUrl, size, canvas)));
	} else {
		image = await loadImage(dataUrl);
		// pixel images are only ever scaled down
		const scale = Math.min(1, LOGO_MAX_PX / Math.max(image.naturalWidth, image.naturalHeight));
		canvas.width = Math.round(image.naturalWidth * scale);
		canvas.height = Math.round(image.naturalHeight * scale);
	}
	canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

	const png = canvas.toDataURL('image/png');
	if (((png.length - png.indexOf(',') - 1) * 3) / 4 > LOGO_MAX_BYTES) throw new LogoTooLargeError();
	return png;
}

// Firefox only draws SVGs with an explicit size, and drawing at the target size keeps edges sharp
function withPixelSize(
	dataUrl: string,
	original: { width: number; height: number },
	target: { width: number; height: number },
): string {
	const payload = dataUrl.slice(dataUrl.indexOf(',') + 1);
	const text = dataUrl.slice(0, dataUrl.indexOf(',')).endsWith(';base64')
		? new TextDecoder().decode(Uint8Array.from(atob(payload), (char) => char.charCodeAt(0)))
		: decodeURIComponent(payload);
	const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
	if (!svg.hasAttribute('viewBox')) {
		svg.setAttribute('viewBox', `0 0 ${original.width} ${original.height}`);
	}
	svg.setAttribute('width', String(target.width));
	svg.setAttribute('height', String(target.height));
	return new XMLSerializer().serializeToString(svg);
}
