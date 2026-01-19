import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import { type IShortUrlStrategy } from './short-url-strategy.interface';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { type TQrCode, type TQrCodeContent } from '@shared/schemas';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { container } from 'tsyringe';
import { LinkShortUrlContentTypeError } from '../../error/http/link-short-url-content-type.error';
import { GetDefaultCustomDomainUseCase } from '@/modules/custom-domain/useCase/get-default-custom-domain.use-case';

export class UrlStrategy implements IShortUrlStrategy {
	appliesTo(content: TQrCodeContent) {
		return (content.type === 'url' && content.data.isEditable) || false;
	}

	async handle(qrCode: TQrCode) {
		if (qrCode.content.type !== 'url') {
			throw new LinkShortUrlContentTypeError(qrCode.content.type);
		}

		const reserved = await container
			.resolve(GetReservedShortCodeUseCase)
			.execute(qrCode.createdBy!);
		if (!reserved) throw new ShortUrlNotFoundError();

		// Get user's default custom domain (if any)
		const defaultDomain = await container
			.resolve(GetDefaultCustomDomainUseCase)
			.execute(qrCode.createdBy!);

		await container.resolve(UpdateShortUrlUseCase).execute(
			reserved,
			{
				destinationUrl: qrCode.content.data.url,
				isActive: true,
				customDomainId: defaultDomain?.id ?? null,
			},
			qrCode.createdBy!,
			qrCode.id,
		);

		return reserved;
	}
}
