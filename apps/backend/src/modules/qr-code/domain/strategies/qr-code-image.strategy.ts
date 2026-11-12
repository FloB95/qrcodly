import { convertQrCodeOptionsToLibraryOptions, type TQrCode } from '@shared/schemas';
import {
	QR_CODE_IMAGE_FOLDER,
	QR_CODE_PREVIEW_IMAGE_FOLDER,
	QR_CODE_UPLOAD_FOLDER,
} from '../../config/constants';
import { renderQrCodePng } from '../../lib/styled-qr-code';
import { BaseImageStrategy } from '@/core/domain/strategies/base-image.strategy';

export class QrCodeImageStrategy extends BaseImageStrategy {
	constructor() {
		super();
	}

	getUploadFolder(): string {
		return QR_CODE_UPLOAD_FOLDER;
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
			this.logger.error('error.qrCode.image.upload', {
				filePath,
				error,
			});
			return undefined;
		}
	}

	async delete(filePath?: string): Promise<void> {
		if (!filePath) return;
		const qrCodePathRegex = new RegExp(`^${QR_CODE_IMAGE_FOLDER}/`);
		if (!qrCodePathRegex.test(filePath)) {
			this.logger.warn(`Attempted to delete image outside the qrCode folder: ${filePath}`);
			return;
		}
		try {
			await this.objectStorage.delete(filePath);
		} catch (error) {
			this.logger.error('error.qrCode.image.delete', {
				filePath,
				error,
			});
		}
	}

	async generatePreview(
		qrCode: Pick<TQrCode, 'id' | 'createdBy' | 'config' | 'qrCodeData'>,
	): Promise<string | undefined> {
		const { id, createdBy, config, qrCodeData } = qrCode;

		if (!qrCodeData) {
			this.logger.warn('qrCode.previewImage.noQrCodeData', { qrCodeId: id });
			return undefined;
		}

		try {
			const fileName = `${id}-${Date.now()}.png`;
			const filePath = this.constructFilePath(
				QR_CODE_PREVIEW_IMAGE_FOLDER,
				createdBy ?? undefined,
				fileName,
			);

			const { image, ...libraryOptions } = convertQrCodeOptionsToLibraryOptions(config);
			const logo = image ? await this.loadLogo(image) : undefined;
			const png = await renderQrCodePng({ ...libraryOptions, data: qrCodeData }, logo);
			await this.objectStorage.upload(filePath, png, 'image/png');
			return filePath;
		} catch (error) {
			this.logger.error('error.qrCode.previewImage.create', {
				qrCode: {
					id,
				},
				error,
			});

			return undefined;
		}
	}
}
