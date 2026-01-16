import { inject, injectable } from 'tsyringe';
import { convertQRCodeDataToStringByType, isDynamic, type TQrCodeContent } from '@shared/schemas';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';

/**
 * Service responsible for computing the qrCodeData string for a QR code.
 * This is the actual data that gets encoded into the QR code image.
 */
@injectable()
export class QrCodeDataService {
	constructor(
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(CustomDomainRepository) private customDomainRepository: CustomDomainRepository,
	) {}

	/**
	 * Computes the qrCodeData string for a QR code.
	 * For dynamic/editable content, this resolves the short URL with custom domain.
	 * For static content, this returns the raw content string.
	 *
	 * @param qrCodeId - The QR code ID
	 * @param content - The QR code content
	 * @returns The computed qrCodeData string
	 */
	async computeQrCodeData(qrCodeId: string, content: TQrCodeContent): Promise<string> {
		// For non-dynamic content, compute directly without short URL
		if (!isDynamic(content)) {
			return convertQRCodeDataToStringByType(content);
		}

		// For dynamic content, we need to resolve the short URL with its custom domain
		const shortUrl = await this.shortUrlRepository.findOneByQrCodeId(qrCodeId);

		if (!shortUrl) {
			// No short URL linked yet - compute without it
			return convertQRCodeDataToStringByType(content);
		}

		// Resolve custom domain if set
		let customDomainHost: string | null = null;
		if (shortUrl.customDomainId) {
			const customDomain = await this.customDomainRepository.findOneById(shortUrl.customDomainId);
			if (customDomain) {
				customDomainHost = customDomain.domain;
			}
		}

		// Build the full short URL with custom domain
		const fullShortUrl = buildShortUrl(shortUrl.shortCode, customDomainHost);

		// Compute the qrCodeData
		return convertQRCodeDataToStringByType(content, fullShortUrl);
	}
}
