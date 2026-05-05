import { createHash } from 'crypto';
import { inject, injectable } from 'tsyringe';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import {
	convertQrCodeOptionsToLibraryOptions,
	RENDER_QR_CODE_MIME_TYPES,
	type TRenderQrCodeDto,
	type TRenderQrCodeFormat,
} from '@shared/schemas';
import { type IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { ImageService } from '@/core/services/image.service';
import { KeyCache } from '@/core/cache/key-cache';
import { env } from '@/core/config/env';
import { generateQrCodeStylingInstance } from '../lib/styled-qr-code';

const CACHE_TTL_SECONDS = 86_400;
const CACHE_PREFIX = 'qr_render:';
const RENDER_TIMEOUT_MS = 5_000;

export type RenderQrCodeResult = {
	buffer: Buffer;
	contentType: string;
	etag: string;
};

@injectable()
export class RenderQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(ImageService) private readonly imageService: ImageService,
		@inject(KeyCache) private readonly cache: KeyCache,
	) {}

	async execute(dto: TRenderQrCodeDto): Promise<RenderQrCodeResult> {
		const format: TRenderQrCodeFormat = dto.format ?? 'png';
		const sizePx = dto.sizePx ?? 512;
		const etag = this.computeEtag(dto, format, sizePx, dto.printSizeMm);
		const contentType = RENDER_QR_CODE_MIME_TYPES[format];
		const cacheKey = `${CACHE_PREFIX}${etag}`;

		const cached = await this.cache.getBuffer(cacheKey);
		if (cached) {
			return { buffer: cached, contentType, etag };
		}

		const buffer = await withTimeout(
			this.renderBuffer(dto, format, sizePx),
			RENDER_TIMEOUT_MS,
			'qr-render',
		);

		await this.cache.set(cacheKey, buffer, CACHE_TTL_SECONDS);
		return { buffer, contentType, etag };
	}

	computeEtag(
		dto: TRenderQrCodeDto,
		format: string,
		sizePx: number,
		printSizeMm: number | undefined,
	): string {
		const hash = createHash('sha1')
			.update(JSON.stringify({ config: dto.config, data: dto.data, format, sizePx, printSizeMm }))
			.digest('hex');
		return `"${hash.slice(0, 16)}"`;
	}

	private async renderBuffer(
		dto: TRenderQrCodeDto,
		format: TRenderQrCodeFormat,
		sizePx: number,
	): Promise<Buffer> {
		const svgText = await this.generateSvg(dto);

		if (format === 'svg') return Buffer.from(svgText, 'utf8');

		const pngBuffer = this.rasterize(svgText, sizePx);

		if (format === 'png') {
			if (dto.printSizeMm) {
				const density = Math.round((sizePx * 25.4) / dto.printSizeMm);
				return sharp(pngBuffer).withMetadata({ density }).png().toBuffer();
			}
			return pngBuffer;
		}

		return format === 'webp'
			? sharp(pngBuffer).webp({ quality: 90 }).toBuffer()
			: sharp(pngBuffer).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
	}

	private async generateSvg(dto: TRenderQrCodeDto): Promise<string> {
		const libraryOptions = convertQrCodeOptionsToLibraryOptions(dto.config);

		if (libraryOptions.image) {
			libraryOptions.image = (await this.resolveImage(libraryOptions.image)) ?? undefined;
		}

		const instance = generateQrCodeStylingInstance({ ...libraryOptions, data: dto.data });

		const svgRaw = await instance.getRawData('svg');
		if (!svgRaw) throw new Error('qr-code-styling returned no SVG data');
		const rawBuffer = Buffer.isBuffer(svgRaw) ? svgRaw : Buffer.from(await svgRaw.arrayBuffer());
		return rawBuffer.toString('utf8').replace(/url\(\s*['"]?#([^'"\)\s]+)['"]?\s*\)/g, 'url(#$1)');
	}

	private rasterize(svgText: string, sizePx: number): Buffer {
		const resvg = new Resvg(Buffer.from(svgText, 'utf8'), {
			fitTo: { mode: 'width', value: sizePx },
			background: 'rgba(0,0,0,0)',
		});
		return Buffer.from(resvg.render().asPng());
	}

	private async resolveImage(image: string): Promise<string | undefined> {
		if (image.startsWith('data:')) return image;

		const publicBase = env.S3_PUBLIC_URL.replace(/\/$/, '');
		if (image.startsWith(`${publicBase}/`)) {
			const storageKey = image.slice(publicBase.length + 1);
			return this.imageService.getImageAsDataUrl(storageKey);
		}

		if (/^https?:\/\//i.test(image)) return undefined;

		return this.imageService.getImageAsDataUrl(image);
	}
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timer);
				reject(error instanceof Error ? error : new Error(String(error)));
			},
		);
	});
}
