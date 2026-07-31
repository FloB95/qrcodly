import { AbstractCommand } from '@/core/command/abstract.command';
import { inject, injectable } from 'tsyringe';
import { hoursFromNow } from '@/core/utils/date';
import { URL_SAFETY_RECHECK_NEW_HOURS } from '../config/constants';
import { urlSafetyUnblocks } from '@/core/metrics';
import { Logger } from '@/core/logging';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import UrlSafetyIncidentRepository from '../domain/repository/url-safety-incident.repository';

/**
 * Manual override for a false positive.
 *
 * There is no admin UI, so this is the operator's escape hatch when Google flags a legitimate
 * customer link. Without `--reactivate` the link stays switched off and the owner turns it back on
 * themselves — the same path the automatic self-healing takes.
 */
@injectable()
export default class UnblockShortUrlCommand extends AbstractCommand {
	constructor(
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(UrlSafetyIncidentRepository)
		private readonly incidentRepository: UrlSafetyIncidentRepository,
		@inject(Logger) private readonly logger: Logger,
	) {
		super();
	}

	protected initialize(): void {
		this.command
			.name('url-safety:unblock')
			.description('Lift a URL safety block on a short URL (false-positive override)')
			.requiredOption('-c, --short-code <code>', 'The 5-character short code')
			.option('-r, --reactivate', 'Also switch the link back on immediately', false);
	}

	protected async execute(options: Record<string, unknown>): Promise<void> {
		const shortCode = String(options.shortCode);
		const reactivate = options.reactivate === true;

		const shortUrl = await this.shortUrlRepository.findOneByShortCode(shortCode);
		if (!shortUrl) {
			console.error(`No short URL found for code "${shortCode}".`);
			process.exitCode = 1;
			return;
		}

		if (shortUrl.safetyStatus !== 'blocked') {
			console.log(`"${shortCode}" is not blocked (safetyStatus=${shortUrl.safetyStatus}).`);
			return;
		}

		await this.shortUrlRepository.clearSafetyBlock(
			shortUrl.id,
			hoursFromNow(URL_SAFETY_RECHECK_NEW_HOURS),
		);
		await this.incidentRepository.resolveForShortUrl(shortUrl.id);

		if (reactivate) {
			await this.shortUrlRepository.update(shortUrl, { isActive: true, updatedAt: new Date() });
		}

		urlSafetyUnblocks.add(1, { reason: 'manual' });
		this.logger.info('url_safety.unblocked', {
			shortUrlId: shortUrl.id,
			shortCode,
			reason: 'manual',
			reactivated: reactivate,
		});

		console.log(
			`Unblocked "${shortCode}".${
				reactivate ? ' Link reactivated.' : ' Link stays disabled until the owner re-enables it.'
			}`,
		);
	}
}
