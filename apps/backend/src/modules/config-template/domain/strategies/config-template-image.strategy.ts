import { type TConfigTemplate } from '../entities/config-template.entity';
import { convertQrCodeOptionsToLibraryOptions } from '@shared/schemas';
import {
	QR_CODE_TEMPLATE_FOLDER,
	QR_CODE_TEMPLATE_PREVIEW_IMAGE_FOLDER,
	QR_CODE_TEMPLATE_UPLOAD_FOLDER,
} from '../../config/constants';
import { BaseImageStrategy } from '@/core/domain/strategies/base-image.strategy';
import { generateQrCodeStylingInstance } from '@/modules/qr-code/lib/styled-qr-code';

export class ConfigTemplateImageStrategy extends BaseImageStrategy {
	constructor() {
		super();
	}

	async upload(
		file: { buffer: Buffer; fileName: string; mimeType: string },
		userId?: string,
	): Promise<string | undefined> {
		const filePath = this.constructFilePath(QR_CODE_TEMPLATE_UPLOAD_FOLDER, userId, file.fileName);
		try {
			await this.objectStorage.upload(filePath, file.buffer, file.mimeType);
			return filePath;
		} catch (error) {
			this.logger.error('error.template.image.upload', { filePath, error });
			return undefined;
		}
	}

	async delete(filePath?: string): Promise<void> {
		if (!filePath) return;
		const templatePathRegex = new RegExp(`^${QR_CODE_TEMPLATE_FOLDER}/`);
		if (!templatePathRegex.test(filePath)) {
			this.logger.warn(`Attempted to delete image outside the template folder: ${filePath}`);
			return;
		}
		try {
			await this.objectStorage.delete(filePath);
		} catch (error) {
			this.logger.error(`error.template.image.delete`, {
				filePath,
				error,
			});
		}
	}

	async generatePreview(
		ConfigTemplate: Pick<TConfigTemplate, 'id' | 'createdBy' | 'config'>,
	): Promise<string | undefined> {
		const { id, createdBy, config } = ConfigTemplate;

		try {
			const fileName = `${id}.webp`;
			const filePath = this.constructFilePath(
				QR_CODE_TEMPLATE_PREVIEW_IMAGE_FOLDER,
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
				data: 'https://www.qrcodly.de/',
			});

			const svg = await instance.getRawData('svg');
			if (!svg) return undefined;

			const svgBuffer = Buffer.isBuffer(svg) ? svg : Buffer.from(await svg.arrayBuffer());
			const webpBuffer = await this.convertSvgToWebp(svgBuffer);

			await this.objectStorage.upload(filePath, webpBuffer, 'image/webp');
			return filePath;
		} catch (error: any) {
			this.logger.error('error.template.previewImage.create', {
				template: {
					id,
				},
				error,
			});
			return undefined;
		}
	}
}
