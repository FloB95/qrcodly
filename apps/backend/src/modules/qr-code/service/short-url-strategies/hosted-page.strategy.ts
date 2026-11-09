import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import { type IShortUrlStrategy } from './short-url-strategy.interface';
import { isHostedPageContent, type TQrCode, type TQrCodeContent } from '@shared/schemas';
import { container } from 'tsyringe';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { LinkShortUrlContentTypeError } from '../../error/http/link-short-url-content-type.error';
import { GetDefaultCustomDomainUseCase } from '@/modules/custom-domain/useCase/get-default-custom-domain.use-case';
import { HostedPageService } from '@/modules/hosted-page/service/hosted-page.service';

/**
 * A hosted QR code gets its page and a short URL that serves it. The page belongs to the short
 * URL, not the QR code: the QR code only encodes that address. Runs inside the create transaction.
 */
export class HostedPageStrategy implements IShortUrlStrategy {
	appliesTo(content: TQrCodeContent) {
		return isHostedPageContent(content);
	}

	async handle(qrCode: TQrCode) {
		if (!isHostedPageContent(qrCode.content)) {
			throw new LinkShortUrlContentTypeError(qrCode.content.type);
		}
		const userId = qrCode.createdBy!;

		const hostedPageService = container.resolve(HostedPageService);
		const page = await hostedPageService.createPage(qrCode.content, userId);
		const reserved = await container
			.resolve(GetReservedShortCodeUseCase)
			.take(userId, { qrCodeId: qrCode.id, hostedPageId: page.id });

		const defaultDomain = await container.resolve(GetDefaultCustomDomainUseCase).execute(userId);
		await container
			.resolve(UpdateShortUrlUseCase)
			.execute(
				reserved,
				{ isActive: true, customDomainId: defaultDomain?.id ?? null },
				userId,
				qrCode.id,
			);
		await hostedPageService.scheduleLinkCheck(reserved.id, qrCode.content);

		return reserved;
	}
}
