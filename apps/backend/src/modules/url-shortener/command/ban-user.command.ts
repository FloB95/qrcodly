import { AbstractCommand } from '@/core/command/abstract.command';
import { inject, injectable } from 'tsyringe';
import { UserBanService } from '@/core/auth';
import { Logger } from '@/core/logging';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import UserSafetyStandingRepository from '../domain/repository/user-safety-standing.repository';

const MANUAL_THREAT_TYPE = 'MANUAL_ABUSE_REVIEW';

/**
 * Manual ban after a human abuse review: suspends the account and blocks every link it owns.
 *
 * The automatic ladder only reacts to Google Web Risk findings; spam or phishing that Google has
 * not listed yet needs this. Reversed with `url-safety:clear-standing` plus `url-safety:unblock`.
 */
@injectable()
export default class BanUserCommand extends AbstractCommand {
	constructor(
		@inject(UserBanService) private readonly userBanService: UserBanService,
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(UserSafetyStandingRepository)
		private readonly standingRepository: UserSafetyStandingRepository,
		@inject(Logger) private readonly logger: Logger,
	) {
		super();
	}

	protected initialize(): void {
		this.command
			.name('url-safety:ban-user')
			.description('Ban a user and block all of their short URLs (manual abuse review)')
			.requiredOption('-u, --user-id <id>', 'The Clerk user id')
			.requiredOption('--reason <reason>', 'Why the user is banned, e.g. "spam-phishing"')
			.option('--dry-run', 'Only list the short URLs that would be blocked', false);
	}

	protected async execute(options: Record<string, unknown>): Promise<void> {
		const userId = String(options.userId);
		const reason = String(options.reason);
		const dryRun = options.dryRun === true;

		const shortUrls = await this.shortUrlRepository.findAllForUser(userId);
		console.log(`${shortUrls.length} short URL(s) owned by "${userId}":`);
		for (const s of shortUrls) {
			console.log(
				`  ${s.shortCode}  active=${s.isActive}  safety=${s.safetyStatus}  qr=${s.qrCodeId ?? '-'}  -> ${s.destinationUrl ?? '(reserved)'}`,
			);
		}

		if (dryRun) {
			console.log('Dry run — nothing changed.');
			return;
		}

		// links first: a failing Clerk call must not leave the phishing links live
		const blocked = await this.shortUrlRepository.blockAllForUser(userId, [MANUAL_THREAT_TYPE]);

		await this.userBanService.ban(userId, {
			reason,
			source: 'manual:cli',
			details: { blockedShortUrls: blocked },
		});

		const standing = await this.standingRepository.findOrCreate(userId);
		await this.standingRepository.update(standing, { bannedAt: new Date() });

		this.logger.warn('url_safety.user_banned_manually', {
			userId,
			reason,
			blockedShortUrls: blocked,
		});
		console.log(`Banned "${userId}" and blocked ${blocked} short URL(s).`);
	}
}
