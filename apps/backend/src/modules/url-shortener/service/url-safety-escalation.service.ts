import { inject, singleton } from 'tsyringe';
import { createClerkClient, type ClerkClient } from '@clerk/fastify';
import { Logger } from '@/core/logging';
import { UserBanService } from '@/core/auth';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import { ABUSE_ALERT_MAIL, DEFAULT_TIME_ZONE, SUPPORT_MAIL } from '@/core/config/constants';
import {
	URL_SAFETY_OFFENCES_BEFORE_BAN,
	URL_SAFETY_OFFENCE_WINDOW_DAYS,
} from '../config/constants';
import { daysAgo } from '@/core/utils/date';
import { urlSafetyNotifications, urlSafetyOffences } from '@/core/metrics';
import UserSafetyStandingRepository from '../domain/repository/user-safety-standing.repository';
import type { TUrlSafetyIncidentSource } from '@shared/schemas';

/**
 * `create`/`update`/`duplicate` mean the user actively typed a malicious destination in. `recheck`
 * means a destination they linked earlier was listed afterwards — which can simply be somebody
 * else's website getting hacked.
 */
const ACTIVE_SOURCES: readonly TUrlSafetyIncidentSource[] = ['create', 'update', 'duplicate'];

const ADMIN_ALERT_SUBJECTS = {
	'auto-ban': (userId: string) => `[QRcodly abuse] account auto-suspended (${userId})`,
	'repeat-finding-needs-review': (userId: string) =>
		`[QRcodly abuse] repeat finding needs review (${userId})`,
	'ban-failed': (userId: string) => `[QRcodly abuse] ACTION NEEDED — ban failed (${userId})`,
} as const;

export type TEscalationOutcome =
	/** First offence in the window: link refused/blocked, warning mail sent. */
	| 'warned'
	/** Repeat offence the user caused directly: account suspended. */
	| 'banned'
	/** Repeat offence found by the background job: flagged for a human, not auto-banned. */
	| 'escalated_to_admin'
	/** Recorded but deliberately not moved onto the ladder (e.g. shadow mode). */
	| 'not_counted';

export interface RecordOffenceParams {
	userId: string;
	/** Flagged destination hostnames — never full URLs. */
	hosts: string[];
	threatTypes: string[];
	source: TUrlSafetyIncidentSource;
	/** Short codes of the affected links, for the notification body. */
	shortCodes?: string[];
	/** When false, everything is logged and metered but the ladder does not move. */
	countTowardsLadder?: boolean;
}

export interface EscalationResult {
	outcome: TEscalationOutcome;
	offenceCount: number;
	banned: boolean;
}

/**
 * The warn→ban ladder.
 *
 * Replaces the Redis-only violation tracker: strikes now survive a cache flush, and the history is
 * queryable. Two deliberate policy choices live here:
 *
 * 1. A single job run counts as **one** offence per user no matter how many links it flagged. One
 *    compromised CMS can flag dozens of a customer's links at once, and that is one event, not
 *    grounds for an instant ban.
 * 2. Only offences the user caused directly can auto-ban. A repeat finding from the background
 *    re-check alerts a human instead, because "the site I linked to got hacked again" is not abuse.
 */
@singleton()
export class UrlSafetyEscalationService {
	private clerk: ClerkClient | null = null;

	constructor(
		@inject(UserSafetyStandingRepository)
		private readonly standingRepository: UserSafetyStandingRepository,
		@inject(UserBanService) private readonly userBanService: UserBanService,
		@inject(Mailer) private readonly mailer: Mailer,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async recordOffence(params: RecordOffenceParams): Promise<EscalationResult> {
		const { userId, hosts, threatTypes, source } = params;

		if (params.countTowardsLadder === false) {
			urlSafetyOffences.add(1, { outcome: 'not_counted', source });
			this.logger.info('url_safety.offence_recorded', {
				userId,
				hosts,
				source,
				outcome: 'not_counted',
			});
			return { outcome: 'not_counted', offenceCount: 0, banned: false };
		}

		const standing = await this.standingRepository.findOrCreate(userId);

		// a lapsed window starts over — two unrelated incidents years apart are not a pattern
		const windowStart = daysAgo(URL_SAFETY_OFFENCE_WINDOW_DAYS);
		const withinWindow = standing.lastOffenceAt !== null && standing.lastOffenceAt >= windowStart;
		const priorCount = withinWindow ? standing.offenceCount : 0;
		const offenceCount = priorCount + 1;
		const now = new Date();

		const alreadyWarned = withinWindow && standing.warnedAt !== null;
		const exceedsThreshold = offenceCount > URL_SAFETY_OFFENCES_BEFORE_BAN;
		const shouldBan = exceedsThreshold && alreadyWarned && ACTIVE_SOURCES.includes(source);

		await this.standingRepository.update(standing, {
			offenceCount,
			firstOffenceAt: withinWindow ? (standing.firstOffenceAt ?? now) : now,
			lastOffenceAt: now,
			warnedAt: withinWindow ? (standing.warnedAt ?? now) : now,
			// a fresh window re-arms the warning mail
			warningEmailSentAt: withinWindow ? standing.warningEmailSentAt : null,
		});

		this.logger.warn('url_safety.offence_recorded', {
			userId,
			hosts,
			threatTypes,
			source,
			offenceCount,
			windowDays: URL_SAFETY_OFFENCE_WINDOW_DAYS,
		});

		if (shouldBan) {
			return this.escalateToBan({ ...params, offenceCount });
		}

		if (exceedsThreshold) {
			// repeat finding, but not something the user did — a human decides
			urlSafetyOffences.add(1, { outcome: 'escalated_to_admin', source });
			this.logger.warn('url_safety.escalated_to_admin', { userId, hosts, source, offenceCount });
			await this.notifyUser(params, offenceCount, false);
			await this.alertAdmin(params, offenceCount, 'repeat-finding-needs-review');
			return { outcome: 'escalated_to_admin', offenceCount, banned: false };
		}

		urlSafetyOffences.add(1, { outcome: 'warned', source });
		this.logger.warn('url_safety.user_warned', { userId, hosts, source, offenceCount });
		await this.notifyUser(params, offenceCount, true);
		return { outcome: 'warned', offenceCount, banned: false };
	}

	/** Clears the ladder and lifts the ban — the manual-review escape hatch behind the CLI. */
	async clearStanding(userId: string): Promise<void> {
		await this.standingRepository.reset(userId);
		await this.userBanService.unban(userId);
		this.logger.info('url_safety.standing_cleared', { userId });
	}

	private async escalateToBan(
		params: RecordOffenceParams & { offenceCount: number },
	): Promise<EscalationResult> {
		const { userId, hosts, threatTypes, source, offenceCount } = params;

		try {
			await this.userBanService.ban(userId, {
				reason: 'repeated-malicious-destination-urls',
				source: 'system:web-risk',
				details: { offenceCount, hosts, threatTypes, triggeredBy: source },
			});
		} catch (error) {
			// Clerk being down must not turn a clean 400 into a 500. The link is still refused and the
			// offence is on record, so the next run can escalate again.
			this.logger.error('url_safety.ban_failed', { userId, offenceCount, error: error as Error });
			// the one case where protection did not happen — a log line alone is not enough
			await this.alertAdmin(params, offenceCount, 'ban-failed');
			return { outcome: 'escalated_to_admin', offenceCount, banned: false };
		}

		const standing = await this.standingRepository.findOneById(userId);
		if (standing) {
			await this.standingRepository.update(standing, { bannedAt: new Date() });
		}

		urlSafetyOffences.add(1, { outcome: 'banned', source });
		this.logger.error('url_safety.user_banned', { userId, hosts, source, offenceCount });

		await this.notifyBan(params);
		await this.alertAdmin(params, offenceCount, 'auto-ban');

		return { outcome: 'banned', offenceCount, banned: true };
	}

	/**
	 * Mail is always sent *after* the block and the offence are persisted, and never rethrows: an
	 * SMTP outage must not lose a block.
	 */
	private async notifyUser(
		params: RecordOffenceParams,
		offenceCount: number,
		isWarning: boolean,
	): Promise<void> {
		try {
			const recipient = await this.resolveRecipient(params.userId);
			if (!recipient) return;

			const template = await this.mailer.getTemplate('url-safety-link-blocked');
			const html = template({
				firstName: recipient.firstName,
				hosts: params.hosts,
				threatTypes: this.humanizeThreatTypes(params.threatTypes),
				shortCodes: params.shortCodes ?? [],
				isWarning,
				offenceCount,
				maxWarnings: URL_SAFETY_OFFENCES_BEFORE_BAN,
				dashboardUrl: `${env.FRONTEND_URL}/dashboard/short-urls`,
				supportEmail: SUPPORT_MAIL,
				logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
				year: new Date().getFullYear(),
			});

			await this.mailer.sendMail({
				to: recipient.email,
				subject: 'Action required: a link in your QRcodly account was blocked',
				html,
				template: 'url-safety-link-blocked',
			});

			await this.standingRepository.markWarningEmailSent(params.userId);
			urlSafetyNotifications.add(1, { channel: 'email', outcome: 'sent' });
		} catch (error) {
			urlSafetyNotifications.add(1, { channel: 'email', outcome: 'failed' });
			this.logger.error('url_safety.notify_failed', {
				userId: params.userId,
				kind: 'link-blocked',
				error: error as Error,
			});
		}
	}

	private async notifyBan(params: RecordOffenceParams): Promise<void> {
		try {
			const recipient = await this.resolveRecipient(params.userId);
			if (!recipient) return;

			const template = await this.mailer.getTemplate('url-safety-account-banned');
			const html = template({
				firstName: recipient.firstName,
				hosts: params.hosts,
				threatTypes: this.humanizeThreatTypes(params.threatTypes),
				shortCodes: params.shortCodes ?? [],
				occurredAt: new Date().toLocaleString('en-GB', { timeZone: DEFAULT_TIME_ZONE }),
				supportEmail: SUPPORT_MAIL,
				logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
				year: new Date().getFullYear(),
			});

			await this.mailer.sendMail({
				to: recipient.email,
				subject: 'Your QRcodly account has been suspended',
				html,
				template: 'url-safety-account-banned',
			});
			urlSafetyNotifications.add(1, { channel: 'email', outcome: 'sent' });
		} catch (error) {
			urlSafetyNotifications.add(1, { channel: 'email', outcome: 'failed' });
			this.logger.error('url_safety.notify_failed', {
				userId: params.userId,
				kind: 'account-banned',
				error: error as Error,
			});
		}
	}

	private async alertAdmin(
		params: RecordOffenceParams,
		offenceCount: number,
		kind: 'auto-ban' | 'repeat-finding-needs-review' | 'ban-failed',
	): Promise<void> {
		try {
			const template = await this.mailer.getTemplate('url-safety-admin-alert');
			const html = template({
				isAutoBan: kind === 'auto-ban',
				isBanFailed: kind === 'ban-failed',
				// a failed ban is as urgent as an applied one — both get the red treatment
				isUrgent: kind !== 'repeat-finding-needs-review',
				userId: params.userId,
				offenceCount,
				source: params.source,
				hosts: params.hosts,
				shortCodes: params.shortCodes ?? [],
				threatTypes: this.humanizeThreatTypes(params.threatTypes),
				clerkUserUrl: `https://dashboard.clerk.com/last-active?path=users/${params.userId}`,
				occurredAt: new Date().toLocaleString('en-GB', { timeZone: DEFAULT_TIME_ZONE }),
				logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
				year: new Date().getFullYear(),
			});

			await this.mailer.sendMail({
				to: ABUSE_ALERT_MAIL,
				subject: ADMIN_ALERT_SUBJECTS[kind](params.userId),
				html,
				template: 'url-safety-admin-alert',
			});
		} catch (error) {
			this.logger.error('url_safety.notify_failed', {
				userId: params.userId,
				kind: 'admin-alert',
				error: error as Error,
			});
		}
	}

	private async resolveRecipient(
		userId: string,
	): Promise<{ email: string; firstName: string } | null> {
		this.clerk ??= createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
		const user = await this.clerk.users.getUser(userId);
		const email = user.emailAddresses[0]?.emailAddress;

		if (!email) {
			this.logger.warn('url_safety.notify_no_email', { userId });
			return null;
		}

		return { email, firstName: user.firstName || 'there' };
	}

	private humanizeThreatTypes(threatTypes: string[]): string {
		const labels: Record<string, string> = {
			SOCIAL_ENGINEERING: 'phishing / social engineering',
			MALWARE: 'malware',
			UNWANTED_SOFTWARE: 'unwanted software',
		};
		const mapped = threatTypes.map((type) => labels[type] ?? type.toLowerCase());
		return mapped.length ? mapped.join(', ') : 'unsafe content';
	}
}
