import { injectable } from 'tsyringe';
import { BaseImageStrategy } from '../domain/strategies/base-image.strategy';
import { QrCodeImageStrategy } from '@/modules/qr-code/domain/strategies/qr-code-image.strategy';

@injectable()
export class ImageService {
	private strategy: BaseImageStrategy;

	constructor() {
		this.strategy = new QrCodeImageStrategy();
	}

	setStrategy(strategy: BaseImageStrategy) {
		this.strategy = strategy;
	}

	async uploadImage(
		base64: string,
		fileName: string,
		userId?: string,
	): Promise<string | undefined> {
		if (!this.strategy.validateAndConvertBase64) {
			throw new Error('Strategy does not support base64 conversion.');
		}
		const file = this.strategy.validateAndConvertBase64(base64, fileName);
		return this.strategy.upload(file, userId);
	}

	async copyImage(sourcePath: string, newEntityId: string, userId: string): Promise<string> {
		return this.strategy.copyImage(sourcePath, newEntityId, userId);
	}

	async deleteImage(imagePath?: string): Promise<void> {
		return this.strategy.delete(imagePath);
	}

	async generatePreview(...args: any[]): Promise<string | undefined> {
		if (!this.strategy.generatePreview) {
			return undefined;
		}
		return this.strategy.generatePreview(...args);
	}

	async getImageAsDataUrl(imagePath: string): Promise<string | undefined> {
		return this.strategy.getImageAsDataUrl(imagePath);
	}

	async getSignedUrl(imagePath: string): Promise<string | undefined> {
		return this.strategy.getSignedUrl(imagePath);
	}

	getPublicUrl(imagePath: string): string {
		return this.strategy.getPublicUrl(imagePath);
	}

	constructFilePath(folder: string, userId: string | undefined, fileName: string): string {
		return this.strategy.constructFilePath(folder, userId, fileName);
	}

	async handleImageUpdate(
		currentImage: string | undefined,
		newImage: string | undefined,
		entityId: string,
		userId: string,
	): Promise<string | undefined> {
		if (currentImage && newImage && !newImage.includes(currentImage)) {
			await this.deleteImage(currentImage);
			return this.uploadImage(newImage, entityId, userId);
		}

		if (!newImage && currentImage) {
			await this.deleteImage(currentImage);
			return undefined;
		}

		if (!currentImage && newImage) {
			return this.uploadImage(newImage, entityId, userId);
		}

		if (currentImage && newImage && newImage.includes(currentImage)) {
			return currentImage;
		}

		return undefined;
	}
}
