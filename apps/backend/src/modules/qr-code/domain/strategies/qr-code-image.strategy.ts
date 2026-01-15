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
import { container } from 'tsyringe';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { buildShortUrl } from '@/modules/url-shortener/utils';

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
		qrCode: Pick<TQrCode, 'id' | 'createdBy' | 'config' | 'content'>,
	): Promise<string | undefined> {
		const { id, createdBy, config, content } = qrCode;

		const shortUrl = await container.resolve(ShortUrlRepository).findOneByQrCodeId(id);

		try {
			const fileName = `${id}.svg`;
			const filePath = this.constructFilePath(
				QR_CODE_PREVIEW_IMAGE_FOLDER,
				createdBy ?? undefined,
				fileName,
			);

			const instance = generateQrCodeStylingInstance({
				...convertQrCodeOptionsToLibraryOptions(config),
				data: convertQRCodeDataToStringByType(
					content,
					shortUrl ? buildShortUrl(shortUrl.shortCode) : undefined,
				),
			});

			const svg = await instance.getRawData('svg');
			if (!svg) return undefined;

			const buffer = Buffer.isBuffer(svg) ? svg : Buffer.from(await svg.arrayBuffer());

			await this.objectStorage.upload(filePath, buffer, 'image/svg+xml');
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
