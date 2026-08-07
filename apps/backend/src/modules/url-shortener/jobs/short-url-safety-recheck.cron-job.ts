import { container, injectable } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { KeyCache } from '@/core/cache';
import { env } from '@/core/config/env';
import {
	URL_SAFETY_BLOCKING_THREAT_TYPES,
	URL_SAFETY_BLOCK_CAP_PER_RUN,
	URL_SAFETY_CONFIRMATION_DELAY_HOURS,
	URL_SAFETY_HOT_SHORT_CODE_LIMIT,
	URL_SAFETY_INCIDENT_RETENTION_DAYS,
	URL_SAFETY_NEW_URL_AGE_DAYS,
	URL_SAFETY_RECHECK_BATCH_SIZE,
	URL_SAFETY_RECHECK_CONCURRENCY,
	URL_SAFETY_RECHECK_ESTABLISHED_DAYS,
	URL_SAFETY_RECHECK_MAX_RUNTIME_MS,
	URL_SAFETY_RECHECK_NEW_HOURS,
	URL_SAFETY_UNKNOWN_BACKOFF_HOURS,
} from '../config/constants';
import { WebRiskService, redactToHost } from '@/core/url-safety';
import { UrlSafetyEscalationService } from '../service/url-safety-escalation.service';
import {
	recordUrlSafetyBacklog,
	urlSafetyBlocks,
	urlSafetyChecks,
	urlSafetyRecheckDuration,
	urlSafetyUnblocks,
} from '@/core/metrics';
import { daysAgo, daysFromNow, hoursFromNow } from '@/core/utils/date';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import UrlSafetyIncidentRepository from '../domain/repository/url-safety-incident.repository';
import { HOT_SHORT_CODES_KEY } from '../config/constants';
import type { TShortUrl } from '../domain/entities/short-url.entity';

/** One flagged link, collected during a run so findings can be grouped per owner afterwards. */
interface Finding {
	userId: string;
	shortCode: string;
	host: string;
	threatTypes: string[];
}

interface RunTally {
	checked: number;
	safe: number;
	unsafe: number;
	unknown: number;
	pending: number;
	blocked: number;
	unblocked: number;
	errors: number;
	capped: boolean;
}

/**
 * Re-screens existing short URLs against Google Web Risk on a rolling schedule.
 *
 * The synchronous check at create/update time only proves a destination was clean *then*. This job
 * covers the two cases it cannot: a destination swapped to a phishing page after the fact, and a
 * legitimate third-party site that got compromised later.
 *
 * Scheduling, batching and the lock: AbstractCronJob holds a Redis lock with a hard-coded 600s TTL
 * and releases it without checking ownership, so a long run can delete its successor's lock. Two
 * defences — a wall-clock budget well under the TTL, and claiming each batch's next-check date
 * before doing any lookups, so overlapping runs work on disjoint rows.
 */
@injectable()
@CronJob()
export class ShortUrlSafetyRecheckCronJob extends AbstractCronJob {
	// Hourly, so a confirmation due in an hour isn't picked up a day later. The due queue caps volume.
	schedule = '0 * * * *';

	protected async execute(): Promise<void> {
		const startedAt = Date.now();
		const enforcing = env.URL_SAFETY_RECHECK_MODE === 'enforce';

		const shortUrlRepository = container.resolve(ShortUrlRepository);
		const incidentRepository = container.resolve(UrlSafetyIncidentRepository);
		const webRisk = container.resolve(WebRiskService);
		const escalation = container.resolve(UrlSafetyEscalationService);

		if (!env.GOOGLE_WEB_RISK_API_KEY) {
			// every lookup would come back `unknown`, burning through the queue's backoff for nothing
			this.logger.warn('url_safety.recheck.skipped', { reason: 'no_api_key' });
			return;
		}

		const hotShortCodes = await this.readHotShortCodes();
		const tally: RunTally = {
			checked: 0,
			safe: 0,
			unsafe: 0,
			unknown: 0,
			pending: 0,
			blocked: 0,
			unblocked: 0,
			errors: 0,
			capped: false,
		};
		const findings: Finding[] = [];

		const due = await shortUrlRepository.findDueForSafetyCheck(URL_SAFETY_RECHECK_BATCH_SIZE);

		if (due.length) {
			// claim first: an overlapping run then sees a different slice instead of double-blocking
			await shortUrlRepository.claimForSafetyCheck(
				due.map((row) => row.id),
				hoursFromNow(URL_SAFETY_UNKNOWN_BACKOFF_HOURS),
			);
		}

		for (let i = 0; i < due.length; i += URL_SAFETY_RECHECK_CONCURRENCY) {
			if (Date.now() - startedAt > URL_SAFETY_RECHECK_MAX_RUNTIME_MS) {
				this.logger.warn('url_safety.recheck.budget_exhausted', {
					processed: tally.checked,
					remaining: due.length - i,
				});
				break;
			}

			const slice = due.slice(i, i + URL_SAFETY_RECHECK_CONCURRENCY);
			await Promise.all(
				slice.map((shortUrl) =>
					this.processOne({
						shortUrl,
						enforcing,
						hotShortCodes,
						blockingAllowed: tally.blocked < URL_SAFETY_BLOCK_CAP_PER_RUN,
						webRisk,
						shortUrlRepository,
						incidentRepository,
						tally,
						findings,
					}).catch((error) => {
						tally.errors++;
						this.logger.error('url_safety.recheck.item_failed', {
							shortUrlId: shortUrl.id,
							error: error as Error,
						});
					}),
				),
			);
		}

		if (tally.blocked >= URL_SAFETY_BLOCK_CAP_PER_RUN) {
			tally.capped = true;
			// a listing glitch must not be able to take the whole corpus offline unnoticed
			this.logger.error('url_safety.recheck.block_cap_reached', {
				cap: URL_SAFETY_BLOCK_CAP_PER_RUN,
				blocked: tally.blocked,
			});
		}

		// One offence per owner per run, deduplicated by host: a single compromised CMS can flag
		// dozens of a customer's links, and that is one event — not grounds for an instant ban.
		await this.escalatePerUser(findings, escalation, enforcing);

		await this.trimHotShortCodes();
		const purged = await incidentRepository
			.deleteOlderThan(daysAgo(URL_SAFETY_INCIDENT_RETENTION_DAYS))
			.catch((error) => {
				this.logger.error('url_safety.recheck.retention_failed', { error: error as Error });
				return 0;
			});

		const backlog = await shortUrlRepository.countDueForSafetyCheck();
		recordUrlSafetyBacklog(backlog);
		urlSafetyRecheckDuration.record(Date.now() - startedAt);

		this.logger.info('url_safety.recheck.completed', {
			mode: env.URL_SAFETY_RECHECK_MODE,
			due: due.length,
			...tally,
			affectedUsers: new Set(findings.map((f) => f.userId)).size,
			purgedIncidents: purged,
			backlog,
			durationMs: Date.now() - startedAt,
		});
	}

	private async processOne(ctx: {
		shortUrl: TShortUrl;
		enforcing: boolean;
		hotShortCodes: Set<string>;
		blockingAllowed: boolean;
		webRisk: WebRiskService;
		shortUrlRepository: ShortUrlRepository;
		incidentRepository: UrlSafetyIncidentRepository;
		tally: RunTally;
		findings: Finding[];
	}): Promise<void> {
		const { shortUrl, webRisk, shortUrlRepository, incidentRepository, tally, findings } = ctx;
		if (!shortUrl.destinationUrl) return;

		const verdict = await webRisk.lookup(shortUrl.destinationUrl);
		urlSafetyChecks.add(1, { source: 'recheck', verdict: verdict.status });
		tally.checked++;

		const host = redactToHost(shortUrl.destinationUrl);

		if (verdict.status === 'unknown') {
			tally.unknown++;
			// deliberately NOT advanced to the long tier — an outage may not certify the corpus clean
			await shortUrlRepository.markSafetyChecked(shortUrl.id, {
				nextSafetyCheckAt: hoursFromNow(URL_SAFETY_UNKNOWN_BACKOFF_HOURS),
				safetyCheckFailures: shortUrl.safetyCheckFailures + 1,
			});
			return;
		}

		if (verdict.status === 'safe') {
			tally.safe++;
			const nextCheck = this.nextCheckFor(shortUrl, ctx.hotShortCodes);

			if (shortUrl.safetyStatus === 'blocked') {
				// Google delisted it. Lift the block but leave the link switched off, so traffic only
				// resumes when the owner deliberately re-enables it.
				await shortUrlRepository.clearSafetyBlock(shortUrl.id, nextCheck);
				await incidentRepository.resolveForShortUrl(shortUrl.id);
				urlSafetyUnblocks.add(1, { reason: 'self_healed' });
				tally.unblocked++;
				this.logger.info('url_safety.unblocked', {
					shortUrlId: shortUrl.id,
					shortCode: shortUrl.shortCode,
					destinationHost: host,
					reason: 'self_healed',
				});
				return;
			}

			await shortUrlRepository.markSafetyChecked(shortUrl.id, {
				safetyStatus: 'clean',
				nextSafetyCheckAt: nextCheck,
				safetyCheckFailures: 0,
				safetyPendingSince: null,
			});
			return;
		}

		// --- unsafe ---
		tally.unsafe++;
		const threatTypes = verdict.threatTypes ?? [];
		const blockworthy = threatTypes.some((type) => URL_SAFETY_BLOCKING_THREAT_TYPES.includes(type));

		if (!blockworthy) {
			// UNWANTED_SOFTWARE on its own: worth recording, not worth breaking a live link over
			await incidentRepository.record({
				userId: shortUrl.createdBy,
				shortUrlId: shortUrl.id,
				destinationHost: host,
				threatTypes,
				source: 'recheck',
				action: 'shadow',
				countedAsOffence: false,
			});
			await shortUrlRepository.markSafetyChecked(shortUrl.id, {
				nextSafetyCheckAt: hoursFromNow(URL_SAFETY_RECHECK_NEW_HOURS),
				safetyThreatTypes: threatTypes.join(','),
			});
			return;
		}

		// Already blocked and still listed: nothing new happened. Leaving a blocked link untouched must
		// never accumulate offences — otherwise a user who simply ignores it gets banned for inaction.
		// We only keep probing so the block can be lifted once Google delists the destination.
		if (shortUrl.safetyStatus === 'blocked') {
			await shortUrlRepository.markSafetyChecked(shortUrl.id, {
				nextSafetyCheckAt: hoursFromNow(URL_SAFETY_RECHECK_NEW_HOURS),
				safetyThreatTypes: threatTypes.join(','),
			});
			return;
		}

		if (shortUrl.safetyPendingSince === null) {
			// first hit only arms a confirmation: one bad lookup should not disable a printed QR code
			tally.pending++;
			await shortUrlRepository.markSafetyChecked(shortUrl.id, {
				nextSafetyCheckAt: hoursFromNow(URL_SAFETY_CONFIRMATION_DELAY_HOURS),
				safetyPendingSince: new Date(),
				safetyThreatTypes: threatTypes.join(','),
			});
			this.logger.info('url_safety.block_pending_confirmation', {
				shortUrlId: shortUrl.id,
				shortCode: shortUrl.shortCode,
				destinationHost: host,
				threatTypes,
			});
			return;
		}

		if (!ctx.enforcing) {
			await incidentRepository.record({
				userId: shortUrl.createdBy,
				shortUrlId: shortUrl.id,
				destinationHost: host,
				threatTypes,
				source: 'recheck',
				action: 'shadow',
				countedAsOffence: false,
			});
			await shortUrlRepository.markSafetyChecked(shortUrl.id, {
				nextSafetyCheckAt: hoursFromNow(URL_SAFETY_RECHECK_NEW_HOURS),
				safetyThreatTypes: threatTypes.join(','),
			});
			urlSafetyBlocks.add(1, {
				source: 'recheck',
				threat_type: threatTypes[0] ?? 'unknown',
				mode: 'shadow',
			});
			this.logger.warn('url_safety.block_skipped_shadow', {
				shortUrlId: shortUrl.id,
				shortCode: shortUrl.shortCode,
				destinationHost: host,
				threatTypes,
			});
			return;
		}

		if (!ctx.blockingAllowed) {
			// cap already hit this run — leave it due so the next run picks it up
			await shortUrlRepository.markSafetyChecked(shortUrl.id, {
				nextSafetyCheckAt: hoursFromNow(URL_SAFETY_CONFIRMATION_DELAY_HOURS),
				safetyThreatTypes: threatTypes.join(','),
			});
			return;
		}

		await shortUrlRepository.blockForSafety(
			shortUrl.id,
			threatTypes,
			hoursFromNow(URL_SAFETY_RECHECK_NEW_HOURS),
		);
		await incidentRepository.record({
			userId: shortUrl.createdBy,
			shortUrlId: shortUrl.id,
			destinationHost: host,
			threatTypes,
			source: 'recheck',
			action: 'blocked',
		});

		tally.blocked++;
		urlSafetyBlocks.add(1, {
			source: 'recheck',
			threat_type: threatTypes[0] ?? 'unknown',
			mode: 'enforce',
		});
		this.logger.warn('url_safety.blocked', {
			shortUrlId: shortUrl.id,
			shortCode: shortUrl.shortCode,
			destinationHost: host,
			threatTypes,
			userId: shortUrl.createdBy,
		});

		findings.push({
			userId: shortUrl.createdBy,
			shortCode: shortUrl.shortCode,
			host,
			threatTypes,
		});
	}

	/**
	 * Busy links are worth checking daily; a link nobody scans and nobody edited in months is not.
	 * The hot set is a proxy — real view counts live in Umami and are too expensive to query per row.
	 */
	private nextCheckFor(shortUrl: TShortUrl, hotShortCodes: Set<string>): Date {
		if (hotShortCodes.has(shortUrl.shortCode)) {
			return hoursFromNow(URL_SAFETY_RECHECK_NEW_HOURS);
		}

		const lastTouched = shortUrl.updatedAt ?? shortUrl.createdAt;
		const isNew = lastTouched >= daysAgo(URL_SAFETY_NEW_URL_AGE_DAYS);

		return isNew
			? hoursFromNow(URL_SAFETY_RECHECK_NEW_HOURS)
			: daysFromNow(URL_SAFETY_RECHECK_ESTABLISHED_DAYS);
	}

	private async escalatePerUser(
		findings: Finding[],
		escalation: UrlSafetyEscalationService,
		enforcing: boolean,
	): Promise<void> {
		if (!findings.length) return;

		const byUser = new Map<string, Finding[]>();
		for (const finding of findings) {
			const bucket = byUser.get(finding.userId);
			if (bucket) bucket.push(finding);
			else byUser.set(finding.userId, [finding]);
		}

		for (const [userId, userFindings] of byUser) {
			try {
				await escalation.recordOffence({
					userId,
					hosts: [...new Set(userFindings.map((f) => f.host))],
					threatTypes: [...new Set(userFindings.flatMap((f) => f.threatTypes))],
					shortCodes: [...new Set(userFindings.map((f) => f.shortCode))],
					source: 'recheck',
					countTowardsLadder: enforcing,
				});
			} catch (error) {
				this.logger.error('url_safety.recheck.escalation_failed', {
					userId,
					error: error as Error,
				});
			}
		}
	}

	private async readHotShortCodes(): Promise<Set<string>> {
		try {
			const codes = await container
				.resolve(KeyCache)
				.getClient()
				.zrevrange(HOT_SHORT_CODES_KEY, 0, URL_SAFETY_HOT_SHORT_CODE_LIMIT - 1);
			return new Set(codes);
		} catch (error) {
			// losing the traffic hint only costs tiering precision — age still drives the schedule
			this.logger.warn('url_safety.hot_set_read_failed', { error: error as Error });
			return new Set();
		}
	}

	private async trimHotShortCodes(): Promise<void> {
		try {
			await container
				.resolve(KeyCache)
				.getClient()
				.zremrangebyrank(HOT_SHORT_CODES_KEY, 0, -(URL_SAFETY_HOT_SHORT_CODE_LIMIT + 1));
		} catch {
			// non-fatal
		}
	}
}
