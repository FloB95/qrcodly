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

	async deleteImage(imagePath?: string): Promise<void> {
		return this.strategy.delete(imagePath);
	}

	async generatePreview(...args: any[]): Promise<string | undefined> {
		if (!this.strategy.generatePreview) {
			return undefined;
		}
		return this.strategy.generatePreview(...args);
	}

	async getSignedUrl(imagePath: string): Promise<string | undefined> {
		return this.strategy.getSignedUrl(imagePath);
	}

	constructFilePath(folder: string, userId: string | undefined, fileName: string): string {
		return this.strategy.constructFilePath(folder, userId, fileName);
	}
}
