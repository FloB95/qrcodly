import { BaseImageStrategy } from './base-image.strategy';
import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
	type TQrCode,
} from '@shared/schemas';
import { QR_CODE_PREVIEW_IMAGE_FOLDER, QR_CODE_UPLOAD_FOLDER } from '../../config/constants';
import { generateQrCodeStylingInstance } from '../../lib/styled-qr-code';

export class QrCodeImageStrategy extends BaseImageStrategy {
	constructor() {
		super();
	}

	async upload(
		file: { buffer: Buffer; fileName: string; mimeType: string },
		userId?: string,
	): Promise<string | undefined> {
		const filePath = this.constructFilePath(QR_CODE_UPLOAD_FOLDER, userId, file.fileName);
		try {
			await this.objectStorage.upload(filePath, file.buffer, file.mimeType);
			return filePath;
		} catch (error) {
			this.logger.error('Failed to upload QR code image', error as Error);
			return undefined;
		}
	}

	async delete(imagePath?: string): Promise<void> {
		if (!imagePath) return;
		try {
			await this.objectStorage.delete(imagePath);
		} catch (error) {
			this.logger.error(`Failed to delete QR code image: ${imagePath}`, error as Error);
		}
	}

	async getSignedUrl(imagePath: string): Promise<string | undefined> {
		try {
			return await this.objectStorage.getSignedUrl(imagePath, this.signedUrlExpirySeconds);
		} catch (error) {
			this.logger.error(
				`Error generating signed URL for QR code image: ${imagePath}`,
				error as Error,
			);
			return undefined;
		}
	}

	async generatePreview(
		qrCode: Pick<TQrCode, 'id' | 'createdBy' | 'config' | 'content' | 'contentType'>,
	): Promise<string | undefined> {
		const { id, createdBy, config, content, contentType } = qrCode;

		try {
			const fileName = `${id}.svg`;
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
}
