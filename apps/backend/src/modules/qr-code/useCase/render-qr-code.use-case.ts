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
import { QrCodeLogoService } from '@/core/services/qr-code-logo.service';
import { Logger } from '@/core/logging';
import { renderQrCodeSvg } from '../lib/styled-qr-code';

const CACHE_TTL_SECONDS = 86_400;
const CACHE_PREFIX = 'qr_render:';
const RENDER_TIMEOUT_MS = 5_000;
// bump when the drawing changes, so cached images and ETags from before are not served again
const RENDER_VERSION = 2;

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
		@inject(QrCodeLogoService) private readonly logoService: QrCodeLogoService,
		@inject(Logger) private readonly logger: Logger,
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

		let buffer: Buffer;
		try {
			buffer = await withTimeout(
				this.renderBuffer(dto, format, sizePx),
				RENDER_TIMEOUT_MS,
				'qr-render',
			);
		} catch (error) {
			// design plugins and API clients get their images here; a failure must be visible
			this.logger.error('error.qrCode.render', {
				format,
				sizePx,
				hasLogo: Boolean(dto.config.image),
				error: error as Error,
			});
			throw error;
		}

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
			.update(
				JSON.stringify({
					config: dto.config,
					data: dto.data,
					format,
					sizePx,
					printSizeMm,
					v: RENDER_VERSION,
				}),
			)
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
		const { image, ...libraryOptions } = convertQrCodeOptionsToLibraryOptions(dto.config);
		const logoDataUrl = image ? await this.resolveImage(image) : undefined;
		const logo = logoDataUrl ? await this.logoService.toLogo(logoDataUrl) : undefined;
		return renderQrCodeSvg({ ...libraryOptions, data: dto.data }, logo);
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
		const isOurUrl = image.startsWith(`${publicBase}/`);
		if (!isOurUrl && /^https?:\/\//i.test(image)) {
			// foreign URLs are never fetched (SSRF); the code is drawn without them, as before
			this.logger.warn('qrCode.render.externalLogoIgnored', { host: new URL(image).host });
			return undefined;
		}

		const storageKey = isOurUrl ? image.slice(publicBase.length + 1) : image;
		const dataUrl = await this.imageService.getImageAsDataUrl(storageKey);
		// a missing file must fail the render, not quietly produce a code without its logo
		if (!dataUrl) throw new Error(`Stored logo not found: ${storageKey}`);
		return dataUrl;
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
