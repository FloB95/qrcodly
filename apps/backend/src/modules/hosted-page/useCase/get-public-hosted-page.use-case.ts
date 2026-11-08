import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { HOSTED_PAGE_PLAN_LIMITS, PlanName } from '@/core/config/plan.config';
import { getStylePresetTheme, type TPublicHostedPageResponseDto } from '@shared/schemas';
import { presentHostedPage } from '../presenters/page-presenters';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { type TShortUrlWithDomain } from '@/modules/url-shortener/domain/entities/short-url.entity';
import HostedPageRepository, {
	toHostedPageBody,
} from '../domain/repository/hosted-page.repository';
import { type THostedPage } from '../domain/entities/hosted-page.entity';
import { HostedPageEntitlementService } from '../service/hosted-page-entitlement.service';
import { HostedPageCacheService } from '../service/hosted-page-cache.service';
import { hostedFileUrl } from '../service/hosted-page.service';
import { HostedFileService } from '../service/hosted-file.service';
import { HostedPageBlockedError } from '../error/http/hosted-page-blocked.error';
import { HostedPageDisabledError } from '../error/http/hosted-page-disabled.error';
import { HostedPageNotFoundError } from '../error/http/hosted-page-not-found.error';

/**
 * Builds the public payload of a hosted page, reached through its short URL; no QR code is needed.
 * A page is only served while its owner's Pro features are on, so the Pro options (no branding,
 * own theme) always apply to a served page.
 */
@injectable()
export class GetPublicHostedPageUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(HostedPageRepository) private readonly pageRepository: HostedPageRepository,
		@inject(HostedPageEntitlementService)
		private readonly entitlementService: HostedPageEntitlementService,
		@inject(HostedPageCacheService) private readonly cacheService: HostedPageCacheService,
		@inject(HostedFileService) private readonly fileService: HostedFileService,
	) {}

	async execute(shortCode: string): Promise<TPublicHostedPageResponseDto> {
		const cached = await this.cacheService.get(shortCode);
		if (cached) return cached;

		const { shortUrl, page } = await this.resolveActivePage(shortCode);
		const result = this.buildPage(shortUrl, page);

		await this.cacheService.set(shortCode, page.createdBy, result);
		return result;
	}

	/** Shared by the file endpoint: the same code can only serve its file while the page is live. */
	async resolveActivePage(
		shortCode: string,
	): Promise<{ shortUrl: TShortUrlWithDomain; page: THostedPage }> {
		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl || shortUrl.deletedAt || !shortUrl.hostedPageId) {
			throw new HostedPageNotFoundError();
		}
		if (shortUrl.safetyStatus === 'blocked') throw new HostedPageBlockedError();
		if (!shortUrl.isActive) throw new HostedPageDisabledError();

		const page = await this.pageRepository.findLiveById(shortUrl.hostedPageId);
		if (!page) throw new HostedPageNotFoundError();
		// Pro has ended and the grace period is over, as for custom domains
		if (!(await this.entitlementService.isServing(page.createdBy))) {
			throw new HostedPageDisabledError();
		}

		return { shortUrl, page };
	}

	private buildPage(
		shortUrl: TShortUrlWithDomain,
		page: THostedPage,
	): TPublicHostedPageResponseDto {
		const body = toHostedPageBody(page);
		const limits = HOSTED_PAGE_PLAN_LIMITS[PlanName.PRO];
		const settings = body.data;
		const url = buildShortUrl(shortUrl.shortCode, shortUrl.customDomain?.domain ?? null);

		return presentHostedPage(
			body,
			{
				shortCode: shortUrl.shortCode,
				showBranding: !(limits.brandingRemovable && settings.hideBranding === true),
				theme:
					limits.customTheme && settings.theme ? settings.theme : getStylePresetTheme('editorial'),
				url,
			},
			{
				fileUrl: (documentId, download) => hostedFileUrl(url, documentId, download),
				assetUrl: (fileKey) => this.fileService.getPublicUrl(fileKey),
			},
		);
	}
}
