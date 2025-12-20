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
			this.logger.error('Failed to upload Template image', error as Error);
			return undefined;
		}
	}

	async delete(imagePath?: string): Promise<void> {
		if (!imagePath) return;
		const templatePathRegex = new RegExp(`^${QR_CODE_TEMPLATE_FOLDER}/`);
		if (!templatePathRegex.test(imagePath)) {
			this.logger.warn(`Attempted to delete image outside the template folder: ${imagePath}`);
			return;
		}
		try {
			await this.objectStorage.delete(imagePath);
		} catch (error) {
			this.logger.error(`Failed to delete Template image: ${imagePath}`, error as Error);
		}
	}

	async generatePreview(
		ConfigTemplate: Pick<TConfigTemplate, 'id' | 'createdBy' | 'config'>,
	): Promise<string | undefined> {
		const { id, createdBy, config } = ConfigTemplate;

		try {
			const fileName = `${id}.svg`;
			const filePath = this.constructFilePath(
				QR_CODE_TEMPLATE_PREVIEW_IMAGE_FOLDER,
				createdBy ?? undefined,
				fileName,
			);

			const instance = await generateQrCodeStylingInstance({
				...convertQrCodeOptionsToLibraryOptions(config),
				data: 'https://www.qrcodly.de/',
			});

			const svg = await instance.getRawData('svg');
			if (!svg) return undefined;

			const buffer = Buffer.isBuffer(svg) ? svg : Buffer.from(await svg.arrayBuffer());

			await this.objectStorage.upload(filePath, buffer, 'image/svg+xml');
			return filePath;
		} catch (error: any) {
			this.logger.error('Failed to generate Template preview image', error);
			return undefined;
		}
	}
}
