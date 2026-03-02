import { inject, injectable } from 'tsyringe';
import { type IContentUpdateStrategy } from './content-update-strategy.interface';
import { type TQrCode } from '../../domain/entities/qr-code.entity';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';

@injectable()
export class VCardContentUpdateStrategy implements IContentUpdateStrategy {
	constructor(@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository) {}

	supports(contentType: string): boolean {
		return contentType === 'vCard';
	}

	async handleContentUpdate(qrCode: TQrCode, updates: Partial<TQrCode>): Promise<void> {
		if (!updates.content || updates.content.type !== 'vCard') return;

		if (qrCode.content.type === 'vCard' && qrCode.content.data.isDynamic) {
			const shortUrl = await this.shortUrlRepository.findOneByQrCodeId(qrCode.id);
			if (!shortUrl) {
				throw new ShortUrlNotFoundError();
			}
		} else {
			updates.content.data.isDynamic = false;
		}
	}
}
