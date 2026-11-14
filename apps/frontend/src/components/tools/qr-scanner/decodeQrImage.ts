import type jsQR from 'jsqr';

type Decoder = typeof jsQR;

export type DecodeFailureReason = 'invalidFile' | 'decodeFailed' | 'noQrFound';
export type DecodeResult = { ok: true; data: string } | { ok: false; reason: DecodeFailureReason };

const IMAGE_EXTENSION = /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i;
/** Used for SVGs without intrinsic dimensions. */
const FALLBACK_SIZE = 1024;
/** Quiet zone added around the image; jsQR needs light space around the finder patterns. */
const MARGIN_RATIO = 0.1;

let decoderPromise: Promise<Decoder> | null = null;

export function loadDecoder(): Promise<Decoder> {
	decoderPromise ??= import('jsqr').then((module) => module.default);
	return decoderPromise;
}

export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/') || IMAGE_EXTENSION.test(file.name);
}

export async function decodeQrImageFile(file: File): Promise<DecodeResult> {
	if (!isImageFile(file)) return { ok: false, reason: 'invalidFile' };

	const decoder = await loadDecoder();
	const objectUrl = URL.createObjectURL(file);
	try {
		const image = await loadImage(objectUrl);
		if (!image) return { ok: false, reason: 'decodeFailed' };

		for (const maxSide of candidateSides(image)) {
			const imageData = drawToImageData(image, maxSide);
			if (!imageData) continue;

			const code = decoder(imageData.data, imageData.width, imageData.height, {
				inversionAttempts: 'attemptBoth',
			});
			if (code) return { ok: true, data: code.data };

			await yieldToBrowser();
		}
		return { ok: false, reason: 'noQrFound' };
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
	const image = new Image();
	image.src = src;
	try {
		await image.decode();
		return image;
	} catch {
		return null;
	}
}

function naturalSize(image: HTMLImageElement) {
	return {
		width: image.naturalWidth || FALLBACK_SIZE,
		height: image.naturalHeight || FALLBACK_SIZE,
	};
}

/**
 * Sizes to try in order: a fast medium size first, the (capped) original for small codes inside
 * large photos, a reduced size that smooths noisy photos, and an upscale for tiny images.
 */
function candidateSides(image: HTMLImageElement): number[] {
	const { width, height } = naturalSize(image);
	const longest = Math.max(width, height);
	const sides = [Math.min(longest, 1200), Math.min(longest, 2400), Math.min(longest, 700)];
	if (longest < 400) sides.push(800);
	return [...new Set(sides)];
}

function drawToImageData(image: HTMLImageElement, maxSide: number): ImageData | null {
	const { width, height } = naturalSize(image);
	const scale = maxSide / Math.max(width, height);
	const drawWidth = Math.max(1, Math.round(width * scale));
	const drawHeight = Math.max(1, Math.round(height * scale));
	const margin = Math.round(Math.max(drawWidth, drawHeight) * MARGIN_RATIO);

	const canvas = document.createElement('canvas');
	canvas.width = drawWidth + margin * 2;
	canvas.height = drawHeight + margin * 2;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) return null;

	// Transparent pixels would otherwise read as black
	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.drawImage(image, margin, margin, drawWidth, drawHeight);
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

function yieldToBrowser() {
	return new Promise<void>((resolve) => setTimeout(resolve, 0));
}
