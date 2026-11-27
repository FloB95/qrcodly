import { convertQrCodeOptionsToLibraryOptions, type TQrCode } from '@shared/schemas';
import { QR_CODE_PREVIEW_IMAGE_FOLDER, QR_CODE_UPLOAD_FOLDER } from '../../config/constants';
import { renderQrCodeSvg } from '../../lib/styled-qr-code';
import { BaseImageStrategy, type TImageOwner } from '@/core/domain/strategies/base-image.strategy';

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

	/**
	 * Deletes an image only if it was stored for this QR code. The logo path sits in the config,
	 * where a client can put the path of somebody else's image, or of a template's.
	 */
	async delete(filePath?: string, owner?: TImageOwner): Promise<void> {
		if (!filePath || !owner || !this.isStoredFor(filePath, owner)) return;
		try {
			await this.objectStorage.delete(filePath);
		} catch (error) {
			this.logger.error('error.qrCode.image.delete', {
				filePath,
				error,
			});
		}
	}

	/** Logos and previews are named after their QR code and lie in the folder of its creator. */
	private isStoredFor(filePath: string, owner: TImageOwner): boolean {
		return [QR_CODE_UPLOAD_FOLDER, QR_CODE_PREVIEW_IMAGE_FOLDER].some((folder) => {
			const start = this.constructFilePath(folder, owner.createdBy ?? undefined, owner.id);
			return filePath.startsWith(`${start}-`) || filePath.startsWith(`${start}.`);
		});
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
			const fileName = `${id}-${Date.now()}.svg`;
			const filePath = this.constructFilePath(
				QR_CODE_PREVIEW_IMAGE_FOLDER,
				createdBy ?? undefined,
				fileName,
			);

			const { image, ...libraryOptions } = convertQrCodeOptionsToLibraryOptions(config);
			const logo = image ? await this.loadLogo(image) : undefined;
			const svg = await renderQrCodeSvg({ ...libraryOptions, data: qrCodeData }, logo);
			await this.objectStorage.upload(filePath, Buffer.from(svg), 'image/svg+xml');
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
