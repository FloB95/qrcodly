import { convertQrCodeOptionsToLibraryOptions, type TQrCode } from '@shared/schemas';
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
			const fileName = `${id}.webp`;
			const filePath = this.constructFilePath(
				QR_CODE_PREVIEW_IMAGE_FOLDER,
				createdBy ?? undefined,
				fileName,
			);

			const libraryOptions = convertQrCodeOptionsToLibraryOptions(config);

			// Scale down for preview generation
			const scale = BaseImageStrategy.PREVIEW_SIZE / (libraryOptions.width ?? 1000);
			libraryOptions.width = BaseImageStrategy.PREVIEW_SIZE;
			libraryOptions.height = BaseImageStrategy.PREVIEW_SIZE;
			if (libraryOptions.imageOptions?.margin) {
				libraryOptions.imageOptions.margin = Math.round(libraryOptions.imageOptions.margin * scale);
			}

			// Optimize icon before embedding (resize to keep SVG small)
			if (libraryOptions.image) {
				libraryOptions.image =
					(await this.getOptimizedImageAsDataUrl(libraryOptions.image)) ?? undefined;
			}

			const instance = generateQrCodeStylingInstance({
				...libraryOptions,
				data: qrCodeData,
			});

			const svg = await instance.getRawData('svg');
			if (!svg) return undefined;

			const svgBuffer = Buffer.isBuffer(svg) ? svg : Buffer.from(await svg.arrayBuffer());
			const webpBuffer = await this.convertSvgToWebp(svgBuffer);

			await this.objectStorage.upload(filePath, webpBuffer, 'image/webp');
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
