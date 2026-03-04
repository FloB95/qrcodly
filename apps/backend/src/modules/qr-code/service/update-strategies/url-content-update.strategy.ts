import { inject, injectable } from 'tsyringe';
import { type IContentUpdateStrategy } from './content-update-strategy.interface';
import { type TQrCode } from '../../domain/entities/qr-code.entity';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { UpdateShortUrlDto } from '@shared/schemas';

@injectable()
export class UrlContentUpdateStrategy implements IContentUpdateStrategy {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(UpdateShortUrlUseCase) private updateShortUrlUseCase: UpdateShortUrlUseCase,
	) {}

	supports(contentType: string): boolean {
		return contentType === 'url';
	}

	async handleContentUpdate(qrCode: TQrCode, updates: Partial<TQrCode>): Promise<void> {
		if (!updates.content || updates.content.type !== 'url') return;

		if (qrCode.content.type === 'url' && qrCode.content.data.isEditable) {
			const shortUrl = await this.shortUrlRepository.findOneByQrCodeId(qrCode.id);
			if (!shortUrl) {
				throw new ShortUrlNotFoundError();
			}

			const updateDto = UpdateShortUrlDto.parse({
				destinationUrl: updates.content.data.url,
			});

			await this.updateShortUrlUseCase.execute(shortUrl, updateDto, qrCode.createdBy!);

			updates.content = qrCode.content;
		} else {
			updates.content.data.isEditable = false;
		}
	}
}
