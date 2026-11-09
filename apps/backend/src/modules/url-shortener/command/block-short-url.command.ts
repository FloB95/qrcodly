import { AbstractCommand } from '@/core/command/abstract.command';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { HostedPageCacheService } from '@/modules/hosted-page/service/hosted-page-cache.service';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { URL_SAFETY_MANUAL_THREAT_TYPE } from '../config/constants';

/**
 * Manual block of a single link after an abuse report, e.g. a phishing PDF on a hosted page: the
 * redirect or page and its files stop at once, the owner's other links keep working. The re-check
 * never lifts it, and neither do the owner's edits. Reversed with `url-safety:unblock`.
 */
@injectable()
export default class BlockShortUrlCommand extends AbstractCommand {
	constructor(
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(HostedPageCacheService) private readonly hostedPageCache: HostedPageCacheService,
		@inject(Logger) private readonly logger: Logger,
	) {
		super();
	}

	protected initialize(): void {
		this.command
			.name('url-safety:block')
			.description('Block a single short URL or hosted page after a manual abuse review')
			.requiredOption('-c, --short-code <code>', 'The short code')
			.requiredOption('--reason <reason>', 'Why the link is blocked, e.g. "phishing-pdf"');
	}

	protected async execute(options: Record<string, unknown>): Promise<void> {
		const shortCode = String(options.shortCode);
		const reason = String(options.reason);

		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl) {
			console.error(`No short URL found for code "${shortCode}".`);
			process.exitCode = 1;
			return;
		}

		await this.shortUrlRepository.blockForSafety(
			shortUrl.id,
			[URL_SAFETY_MANUAL_THREAT_TYPE],
			null,
			{ manual: true },
		);
		if (shortUrl.hostedPageId) await this.hostedPageCache.invalidateShortCode(shortCode);

		this.logger.warn('url_safety.blocked_manually', {
			shortUrlId: shortUrl.id,
			shortCode,
			userId: shortUrl.createdBy,
			hostedPageId: shortUrl.hostedPageId,
			reason,
		});
		console.log(
			`Blocked "${shortCode}" (${shortUrl.hostedPageId ? `hosted page ${shortUrl.hostedPageId}` : (shortUrl.destinationUrl ?? 'reserved')}).`,
		);
	}
}
