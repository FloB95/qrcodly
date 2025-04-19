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
	constructor(
		@inject(ObjectStorage) private objectStorage: ObjectStorage,
		@inject(Logger) private logger: Logger,
	) {}

	private generateFileFromBase64(base64: string, fileName: string) {
		// Convert base64 image to buffer and validate
		if (base64) {
			const isBase64 = base64.startsWith('data:image/') && base64.includes(';base64,');
			if (!isBase64) {
				throw new BadRequestError('Invalid base64 image format');
			}

			// Extract the mime type and the actual base64 data
			const [metadata, base64Data] = base64.split(',');
			const mimeType = metadata.split(';')[0].split(':')[1];

			// Validate mime type
			const validMimeTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
			if (!validMimeTypes.includes(mimeType)) {
				throw new BadRequestError('Invalid image type. Only JPG, PNG, SVG, and WEBP are allowed.');
			}

			// Decode base64 to buffer
			const buffer = Buffer.from(base64Data, 'base64');

			// Handle file extension
			let extension = mimeType.split('/')[1];
			if (extension === 'svg+xml') {
				extension = 'svg';
			}

			return {
				buffer,
				fileName: `${fileName}.${extension}`,
				mimeType,
			};
		}

		return undefined;
	}

	public async uploadQrCodeImage(
		qrCode: Omit<TQrCode, 'createdAt' | 'updatedAt'>,
	): Promise<string | undefined> {
		if (!qrCode.config.image) return undefined;
		const file = this.generateFileFromBase64(qrCode.config.image, qrCode.id);
		if (!file) return undefined;

		const filePath = qrCode.createdBy
			? `${QR_CODE_UPLOAD_FOLDER}/${qrCode.createdBy}/${file.fileName}`
			: `${QR_CODE_UPLOAD_FOLDER}/${file.fileName}`;

		try {
			await this.objectStorage.upload(filePath, file.buffer, file.mimeType);
			return filePath;
		} catch (error) {
			this.logger.error('Failed to upload QR code image', error as Error);
			return undefined;
		}
	}

	public async deleteQrCodeImages(qrCode: TQrCode): Promise<void> {
		if (qrCode.config.image) {
			try {
				await this.objectStorage.delete(qrCode.config.image);
			} catch (error) {
				this.logger.error('Failed to delete QR code image', error as Error);
			}
		}

		if (qrCode.previewImage) {
			try {
				await this.objectStorage.delete(qrCode.previewImage);
			} catch (error) {
				this.logger.error('Failed to delete QR code image', error as Error);
			}
		}
	}

	public async generatePreviewImage(
		qrCode: Omit<TQrCode, 'createdAt' | 'updatedAt'>,
	): Promise<string | undefined> {
		try {
			// TODO: Check fix for this
			// if qrcode has image, preview image can be generated from it
			if (qrCode.previewImage || qrCode.config.image) return;

			const fileName = `${qrCode.id}.webp`;
			const filePath = qrCode.createdBy
				? `${QR_CODE_PREVIEW_IMAGE_FOLDER}/${qrCode.createdBy}/${fileName}`
				: `${QR_CODE_PREVIEW_IMAGE_FOLDER}/${fileName}`;

			qrCode = await this.generatePresignedUrls(qrCode as TQrCode);
			const instance = await generateQrCodeStylingInstance({
				...convertQrCodeOptionsToLibraryOptions(qrCode.config),
				data: convertQRCodeDataToStringByType(qrCode.content, qrCode.contentType),
			});

			// Generate the QR code in SVG format
			const svg = await instance.getRawData('svg');
			if (!svg) return;
			const buffer = Buffer.isBuffer(svg)
				? svg
				: svg instanceof Blob && Buffer.from(await svg.arrayBuffer());

			await this.objectStorage.upload(filePath, buffer as Buffer, 'image/svg+xml');
			return filePath;
		} catch (error) {
			this.logger.error('Failed to upload QR code preview image', error as Error);
			return;
		}
	}

	private async convertImagePathToPresignedUrl(imagePath: string): Promise<string | undefined> {
		try {
			// The URL will be valid for 24 hours
			return await this.objectStorage.getSignedUrl(imagePath, 24 * 60 * 60);
		} catch (error) {
			this.logger.error(`Error generating signed URL for image: ${imagePath}`, error as Error);
			return undefined;
		}
	}

	public async generatePresignedUrls(qrCode: TQrCode) {
		if (qrCode.config.image) {
			qrCode.config.image = await this.convertImagePathToPresignedUrl(qrCode.config.image);
		}

		if (qrCode.previewImage) {
			qrCode.previewImage =
				(await this.convertImagePathToPresignedUrl(qrCode.previewImage)) || null;
		}

		return qrCode;
	}
}
