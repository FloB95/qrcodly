import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import { type IShortUrlStrategy } from './short-url-strategy.interface';
import { type TQrCode, type TQrCodeContent } from '@shared/schemas';
import { container } from 'tsyringe';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { DYNAMIC_QR_BASE_URL } from '@/modules/url-shortener/config/constants';
import { LinkShortUrlContentTypeError } from '../../error/http/link-short-url-content-type.error';

export class VCardStrategy implements IShortUrlStrategy {
	appliesTo(content: TQrCodeContent) {
		return content.type === 'vCard' && content.data.isDynamic === true;
	}

	async handle(qrCode: TQrCode) {
		if (qrCode.content.type !== 'vCard') {
			throw new LinkShortUrlContentTypeError(qrCode.content.type);
		}

		const reserved = await container
			.resolve(GetReservedShortCodeUseCase)
			.execute(qrCode.createdBy!);

		if (!reserved) throw new ShortUrlNotFoundError();

		await container
			.resolve(UpdateShortUrlUseCase)
			.execute(
				reserved,
				{ destinationUrl: `${DYNAMIC_QR_BASE_URL}${qrCode.id}`, isActive: true },
				qrCode.createdBy!,
				qrCode.id,
			);

		return reserved;
	}
}
