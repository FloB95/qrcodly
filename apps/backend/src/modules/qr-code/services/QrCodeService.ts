import { BadRequestError } from '@/core/error/http';
import { QR_CODE_PREVIEW_IMAGE_FOLDER, QR_CODE_UPLOAD_FOLDER } from '../config/constants';
import { ObjectStorage } from '@/core/storage';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { TQrCode } from '../domain/entities/QrCode';
import { generateQrCodeStylingInstance } from '../lib/styled-qr-code';
import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
} from '@shared/schemas';

@injectable()
export class QrCodeService {
	private readonly validMimeTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
	private readonly signedUrlExpirySeconds = 24 * 60 * 60; // 24 hours

	constructor(
		@inject(ObjectStorage) private objectStorage: ObjectStorage,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Validates and converts a base64 string into a file object.
	 */
	private validateAndConvertBase64(base64: string, fileName: string) {
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

	/**
	 * Constructs the file path for QR code images.
	 */
	private constructFilePath(folder: string, userId: string | undefined, fileName: string): string {
		return userId ? `${folder}/${userId}/${fileName}` : `${folder}/${fileName}`;
	}

	/**
	 * Uploads a QR code image to object storage.
	 */
	public async uploadQrCodeImage(
		qrCode: Pick<TQrCode, 'id' | 'createdBy' | 'config'>,
	): Promise<string | undefined> {
		const { config, id, createdBy } = qrCode;
		if (!config.image) return undefined;

		try {
			const file = this.validateAndConvertBase64(config.image, id);
			const filePath = this.constructFilePath(
				QR_CODE_UPLOAD_FOLDER,
				createdBy ?? undefined,
				file.fileName,
			);
			await this.objectStorage.upload(filePath, file.buffer, file.mimeType);
			return filePath;
		} catch (error) {
			this.logger.error('Failed to upload QR code image', error as Error);
			return undefined;
		}
	}

	/**
	 * Deletes a single image from object storage.
	 */
	private async deleteImage(imagePath: string | undefined): Promise<void> {
		if (!imagePath) return;
		try {
			await this.objectStorage.delete(imagePath);
		} catch (error) {
			this.logger.error(`Failed to delete image: ${imagePath}`, error as Error);
		}
	}

	/**
	 * Deletes QR code images from object storage.
	 */
	public async deleteQrCodeImages(qrCode: Pick<TQrCode, 'config' | 'previewImage'>): Promise<void> {
		await Promise.all([
			this.deleteImage(qrCode.config.image),
			this.deleteImage(qrCode.previewImage ?? undefined),
		]);
	}

	/**
	 * Generates a preview image for the QR code.
	 */
	public async generatePreviewImage(
		qrCode: Pick<
			TQrCode,
			'id' | 'createdBy' | 'config' | 'content' | 'contentType' | 'previewImage'
		>,
	): Promise<string | undefined> {
		const { id, createdBy, config, content, contentType, previewImage } = qrCode;
		if (previewImage || config.image) return undefined;

		try {
			const fileName = `${id}.webp`;
			const filePath = this.constructFilePath(
				QR_CODE_PREVIEW_IMAGE_FOLDER,
				createdBy ?? undefined,
				fileName,
			);

			const instance = await generateQrCodeStylingInstance({
				...convertQrCodeOptionsToLibraryOptions(config),
				data: convertQRCodeDataToStringByType(content, contentType),
			});

			const svg = await instance.getRawData('svg');
			if (!svg) return undefined;

			const buffer = Buffer.isBuffer(svg) ? svg : Buffer.from(await svg.arrayBuffer());

			await this.objectStorage.upload(filePath, buffer, 'image/svg+xml');
			return filePath;
		} catch (error) {
			this.logger.error('Failed to generate QR code preview image', error as Error);
			return undefined;
		}
	}

	/**
	 * Converts an image path to a presigned URL.
	 */
	private async convertImagePathToPresignedUrl(imagePath: string): Promise<string | undefined> {
		try {
			return await this.objectStorage.getSignedUrl(imagePath, this.signedUrlExpirySeconds);
		} catch (error) {
			this.logger.error(`Error generating signed URL for image: ${imagePath}`, error as Error);
			return undefined;
		}
	}

	/**
	 * Generates presigned URLs for QR code images.
	 */
	public async generatePresignedUrls(qrCode: TQrCode): Promise<TQrCode> {
		const updatedQrCode = { ...qrCode };
		if (updatedQrCode.config.image) {
			updatedQrCode.config.image = await this.convertImagePathToPresignedUrl(
				updatedQrCode.config.image,
			);
		}

		if (updatedQrCode.previewImage) {
			updatedQrCode.previewImage =
				(await this.convertImagePathToPresignedUrl(updatedQrCode.previewImage)) ?? null;
		}

		return updatedQrCode;
	}
}
