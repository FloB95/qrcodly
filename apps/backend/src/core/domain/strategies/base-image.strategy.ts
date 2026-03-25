import { BadRequestError } from '@/core/error/http';
import { ObjectStorage } from '@/core/storage';
import { Logger } from '@/core/logging';
import { container } from 'tsyringe';
import sharp from 'sharp';

export abstract class BaseImageStrategy {
	protected readonly validMimeTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
	protected readonly signedUrlExpirySeconds = 7 * 24 * 60 * 60; // 7 Days
	protected readonly objectStorage: ObjectStorage;
	protected readonly logger: Logger;

	constructor() {
		this.objectStorage = container.resolve(ObjectStorage);
		this.logger = container.resolve(Logger);
	}

	validateAndConvertBase64(base64: string, fileName: string) {
		if (!base64?.startsWith('data:image/') || !base64?.includes(';base64,')) {
			throw new BadRequestError('Invalid base64 image format');
		}

		const [metadata, base64Data] = base64.split(',');
		const mimeType = metadata.split(';')[0].split(':')[1];

		if (!this.validMimeTypes.includes(mimeType)) {
			throw new BadRequestError('Invalid image type. Only JPG, PNG, SVG, and WEBP are allowed.');
		}

		const buffer = Buffer.from(base64Data, 'base64');
		const extension = mimeType === 'image/svg+xml' ? 'svg' : mimeType.split('/')[1];

		return { buffer, fileName: `${fileName}.${extension}`, mimeType };
	}

	constructFilePath(folder: string, userId: string | undefined, fileName: string): string {
		return userId ? `${folder}/${userId}/${fileName}` : `${folder}/${fileName}`;
	}

	private static readonly extensionToMimeType: Record<string, string> = {
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		svg: 'image/svg+xml',
		webp: 'image/webp',
	};

	/**
	 * Downloads an image from object storage and returns it as a base64 data URL.
	 * Useful for server-side rendering where JSDOM cannot load images from URLs.
	 */
	async getImageAsDataUrl(storagePath: string): Promise<string | undefined> {
		try {
			const imageBuffer = await this.objectStorage.get(storagePath);
			if (!imageBuffer) return undefined;

			const ext = storagePath.split('.').pop()?.toLowerCase() ?? '';
			const mimeType = BaseImageStrategy.extensionToMimeType[ext] ?? 'application/octet-stream';
			return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
		} catch (error) {
			this.logger.error('error.image.getAsDataUrl', { storagePath, error: error as Error });
			return undefined;
		}
	}

	protected static readonly PREVIEW_SIZE = 800;

	protected async convertToWebp(pngBuffer: Buffer): Promise<Buffer> {
		return sharp(pngBuffer).webp({ quality: 85 }).toBuffer();
	}

	async getSignedUrl(imagePath: string): Promise<string | undefined> {
		try {
			return await this.objectStorage.getSignedUrl(imagePath, this.signedUrlExpirySeconds);
		} catch (error) {
			this.logger.error(`error.generating.signedUrl`, {
				imagePath,
				error: error as Error,
			});
			return undefined;
		}
	}

	abstract upload(
		file: { buffer: Buffer; fileName: string; mimeType: string },
		userId?: string,
	): Promise<string | undefined>;
	abstract delete(imagePath?: string): Promise<void>;
	abstract generatePreview?(...args: any[]): Promise<string | undefined>;
}
