import type { Options } from 'qr-code-styling';
import * as Sentry from '@sentry/nextjs';
import {
	buildQrCodeSvg,
	measureImageDataUrl,
	type TFileExtension,
	type TQrCodeLogo,
} from '@shared/schemas';
import { fetchImageAsBase64 } from '@/lib/utils';

// Every QR image in the browser comes from here, built by the same shared function the backend
// uses, so previews, downloads, exports and the design plugins all show the identical code.

// a failure here means a customer gets no QR code or a wrong one, so every one goes to Sentry
function reportRenderError(error: unknown, stage: 'svg' | 'raster' | 'logo', image?: string) {
	Sentry.captureException(error, {
		tags: { area: 'qr-render', stage },
		// only the logo's type or address, never its content
		extra: { logo: !image ? 'none' : image.startsWith('data:') ? image.split(';')[0] : image },
	});
}

// stored logos are fetched once per page view, not for every preview update or exported file
const storedLogos = new Map<string, Promise<string>>();

async function loadLogo(image: string | undefined): Promise<TQrCodeLogo | undefined> {
	if (!image) return undefined;

	let dataUrl = image;
	if (!image.startsWith('data:')) {
		if (!storedLogos.has(image)) storedLogos.set(image, fetchImageAsBase64(image));
		dataUrl = await storedLogos.get(image)!.catch((error: unknown) => {
			storedLogos.delete(image);
			throw error;
		});
	}

	const size = measureImageDataUrl(dataUrl);
	if (!size) throw new Error('Unsupported logo format');
	return { dataUrl, ...size };
}

export async function renderQrCodeSvg(options: Options): Promise<string> {
	try {
		return await buildQrCodeSvg(options, await loadLogo(options.image));
	} catch (error) {
		reportRenderError(error, 'svg', options.image);
		throw error;
	}
}

export const svgToDataUrl = (svg: string) =>
	`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function loadImage(src: string): Promise<HTMLImageElement> {
	const image = new Image();
	return new Promise((resolve, reject) => {
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('Image could not be drawn'));
		image.src = src;
	});
}

export async function renderQrCodeBlob(options: Options, extension: TFileExtension): Promise<Blob> {
	const svg = await renderQrCodeSvg(options);
	if (extension === 'svg') return new Blob([svg], { type: 'image/svg+xml' });

	try {
		const image = await loadImage(svgToDataUrl(svg));
		const canvas = document.createElement('canvas');
		canvas.width = options.width ?? image.naturalWidth;
		canvas.height = options.height ?? image.naturalHeight;
		canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

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
