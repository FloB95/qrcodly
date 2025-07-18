import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
	type TQrCode,
} from '@shared/schemas';
import {
	QR_CODE_IMAGE_FOLDER,
	QR_CODE_PREVIEW_IMAGE_FOLDER,
	QR_CODE_UPLOAD_FOLDER,
} from '../../config/constants';
import { generateQrCodeStylingInstance } from '../../lib/styled-qr-code';
import { BaseImageStrategy } from '@/core/domain/strategies/base-image.strategy';

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
		const qrCodePathRegex = new RegExp(`^${QR_CODE_IMAGE_FOLDER}/`);
		if (!qrCodePathRegex.test(imagePath)) {
			this.logger.warn(`Attempted to delete image outside the qrCode folder: ${imagePath}`);
			return;
		}
		try {
			await this.objectStorage.delete(imagePath);
		} catch (error) {
			this.logger.error(`Failed to delete QR code image: ${imagePath}`, error as Error);
		}
	}

	async generatePreview(
		qrCode: Pick<TQrCode, 'id' | 'createdBy' | 'config' | 'content'>,
	): Promise<string | undefined> {
		const { id, createdBy, config, content } = qrCode;

		try {
			const fileName = `${id}.svg`;
			const filePath = this.constructFilePath(
				QR_CODE_PREVIEW_IMAGE_FOLDER,
				createdBy ?? undefined,
				fileName,
			);

			const instance = await generateQrCodeStylingInstance({
				...convertQrCodeOptionsToLibraryOptions(config),
				data: convertQRCodeDataToStringByType(content),
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
