import 'reflect-metadata';
import { mock } from 'jest-mock-extended';
import type { Logger } from '@/core/logging';
import type { KeyCache } from '@/core/cache';
import type { WebRiskService } from '@/core/url-safety';
import type { UrlSafetyEscalationService } from '../../service/url-safety-escalation.service';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import type UrlSafetyIncidentRepository from '../../domain/repository/url-safety-incident.repository';
import type { TShortUrl } from '../../domain/entities/short-url.entity';
import { SHORT_URL_SAFETY_DEFAULTS } from '../../domain/entities/short-url.entity';
import {
	URL_SAFETY_BLOCK_CAP_PER_RUN,
	URL_SAFETY_RECHECK_CONCURRENCY,
} from '../../config/constants';

// the decorator resolves from the container at import time — neutralise it
jest.mock('@/core/decorators/cron-job.decorator', () => ({ CronJob: () => () => {} }));

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return {
		...actual,
		container: { ...actual.container, resolve: jest.fn() },
	};
});

jest.mock('@/core/config/env', () => ({
	env: { URL_SAFETY_RECHECK_MODE: 'enforce', GOOGLE_WEB_RISK_API_KEY: 'test-key' },
}));

import { container } from 'tsyringe';
import { env } from '@/core/config/env';

const mockEnv = env as unknown as {
	URL_SAFETY_RECHECK_MODE: 'enforce' | 'shadow';
	GOOGLE_WEB_RISK_API_KEY: string | undefined;
};
import { ShortUrlSafetyRecheckCronJob } from '../short-url-safety-recheck.cron-job';

const shortUrl = (overrides: Partial<TShortUrl> = {}): TShortUrl => ({
	id: 'su-1',
	shortCode: 'ab3xz',
	name: null,
	destinationUrl: 'https://example.com/landing',
	qrCodeId: null,
	customDomainId: null,
	isActive: true,
	createdBy: 'user_1',
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	deletedAt: null,
	...SHORT_URL_SAFETY_DEFAULTS,
	...overrides,
});

describe('ShortUrlSafetyRecheckCronJob', () => {
	let job: ShortUrlSafetyRecheckCronJob;
	let repo: jest.Mocked<ShortUrlRepository>;
	let incidents: jest.Mocked<UrlSafetyIncidentRepository>;
	let webRisk: jest.Mocked<WebRiskService>;
	let escalation: jest.Mocked<UrlSafetyEscalationService>;
	let cache: jest.Mocked<KeyCache>;
	let logger: jest.Mocked<Logger>;
	let redis: { zrevrange: jest.Mock; zremrangebyrank: jest.Mock };

	const run = () => (job as unknown as { execute: () => Promise<void> }).execute();

	beforeEach(() => {
		mockEnv.URL_SAFETY_RECHECK_MODE = 'enforce';
		mockEnv.GOOGLE_WEB_RISK_API_KEY = 'test-key';

		repo = mock<ShortUrlRepository>();
		incidents = mock<UrlSafetyIncidentRepository>();
		webRisk = mock<WebRiskService>();
		escalation = mock<UrlSafetyEscalationService>();
		cache = mock<KeyCache>();
		logger = mock<Logger>();

		redis = { zrevrange: jest.fn().mockResolvedValue([]), zremrangebyrank: jest.fn() };
		cache.getClient.mockReturnValue(redis as never);

		repo.findDueForSafetyCheck.mockResolvedValue([]);
		repo.countDueForSafetyCheck.mockResolvedValue(0);
		incidents.deleteOlderThan.mockResolvedValue(0);
		escalation.recordOffence.mockResolvedValue({
			outcome: 'warned',
			offenceCount: 1,
			banned: false,
		});

		(container.resolve as jest.Mock).mockImplementation((token: { name?: string }) => {
			switch (token?.name) {
				case 'ShortUrlRepository':
					return repo;
				case 'UrlSafetyIncidentRepository':
					return incidents;
				case 'WebRiskService':
					return webRisk;
				case 'UrlSafetyEscalationService':
					return escalation;
				case 'KeyCache':
					return cache;
				case 'Logger':
					return logger;
				default:
					return mock();
			}
		});

		job = new ShortUrlSafetyRecheckCronJob();
		(job as unknown as { logger: Logger }).logger = logger;
	});

	afterEach(() => jest.clearAllMocks());

	it('runs at 05:00, after the billing jobs', () => {
		expect(job.schedule).toBe('0 5 * * *');
	});

	it('skips entirely when no API key is configured', async () => {
		mockEnv.GOOGLE_WEB_RISK_API_KEY = undefined;

		await run();

		expect(repo.findDueForSafetyCheck).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith('url_safety.recheck.skipped', {
			reason: 'no_api_key',
		});
	});

	it('claims the batch before any lookup so overlapping runs cannot double-process', async () => {
		repo.findDueForSafetyCheck.mockResolvedValue([shortUrl()]);
		webRisk.lookup.mockResolvedValue({ status: 'safe' });

		await run();

		expect(repo.claimForSafetyCheck).toHaveBeenCalledWith(['su-1'], expect.any(Date));
		const claimOrder = repo.claimForSafetyCheck.mock.invocationCallOrder[0];
		const lookupOrder = webRisk.lookup.mock.invocationCallOrder[0];
		expect(claimOrder).toBeLessThan(lookupOrder);
	});

	describe('unknown verdict (Web Risk outage)', () => {
		it('applies a short backoff instead of certifying the link clean', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([shortUrl({ safetyCheckFailures: 2 })]);
			webRisk.lookup.mockResolvedValue({ status: 'unknown', unknownReason: 'http_error' });

			await run();

			expect(repo.markSafetyChecked).toHaveBeenCalledWith('su-1', {
				nextSafetyCheckAt: expect.any(Date),
				safetyCheckFailures: 3,
			});
			// crucially: no safetyStatus change, so it never reads as "clean"
			const payload = repo.markSafetyChecked.mock.calls[0][1];
			expect(payload).not.toHaveProperty('safetyStatus');

			const hours = (payload.nextSafetyCheckAt.getTime() - Date.now()) / 3_600_000;
			expect(hours).toBeLessThan(7); // the 6h backoff, not the 7-day tier
		});

		it('never blocks and never escalates', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([shortUrl()]);
			webRisk.lookup.mockResolvedValue({ status: 'unknown', unknownReason: 'timeout' });

			await run();

			expect(repo.blockForSafety).not.toHaveBeenCalled();
			expect(escalation.recordOffence).not.toHaveBeenCalled();
		});
	});

	describe('safe verdict', () => {
		it('schedules an established link a week out', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({ updatedAt: new Date('2026-01-01') }),
			]);
			webRisk.lookup.mockResolvedValue({ status: 'safe' });

			await run();

			const payload = repo.markSafetyChecked.mock.calls[0][1];
			const days = (payload.nextSafetyCheckAt.getTime() - Date.now()) / 86_400_000;
			expect(days).toBeGreaterThan(6);
		});

		it('checks a hot (recently scanned) link daily even when it is old', async () => {
			redis.zrevrange.mockResolvedValue(['ab3xz']);
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({ updatedAt: new Date('2026-01-01') }),
			]);
			webRisk.lookup.mockResolvedValue({ status: 'safe' });

			await run();

			const payload = repo.markSafetyChecked.mock.calls[0][1];
			const hours = (payload.nextSafetyCheckAt.getTime() - Date.now()) / 3_600_000;
			expect(hours).toBeLessThan(25);
		});

		it('self-heals a blocked link but leaves it switched off', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({ safetyStatus: 'blocked', isActive: false, safetyBlockedAt: new Date() }),
			]);
			webRisk.lookup.mockResolvedValue({ status: 'safe' });

			await run();

			expect(repo.clearSafetyBlock).toHaveBeenCalledWith('su-1', expect.any(Date));
			expect(incidents.resolveForShortUrl).toHaveBeenCalledWith('su-1');
			// clearSafetyBlock does not touch isActive — the owner re-enables deliberately
			expect(repo.update).not.toHaveBeenCalled();
			expect(logger.info).toHaveBeenCalledWith(
				'url_safety.unblocked',
				expect.objectContaining({ reason: 'self_healed' }),
			);
		});
	});

	describe('unsafe verdict', () => {
		it('requires a confirming second lookup before blocking', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([shortUrl({ safetyPendingSince: null })]);
			webRisk.lookup.mockResolvedValue({
				status: 'unsafe',
				threatTypes: ['SOCIAL_ENGINEERING'],
			});

			await run();

			expect(repo.blockForSafety).not.toHaveBeenCalled();
			expect(repo.markSafetyChecked).toHaveBeenCalledWith(
				'su-1',
				expect.objectContaining({ safetyPendingSince: expect.any(Date) }),
			);
			expect(logger.info).toHaveBeenCalledWith(
				'url_safety.block_pending_confirmation',
				expect.objectContaining({ shortCode: 'ab3xz' }),
			);
		});

		it('blocks once the finding is confirmed', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({ safetyPendingSince: new Date('2026-07-30') }),
			]);
			webRisk.lookup.mockResolvedValue({ status: 'unsafe', threatTypes: ['MALWARE'] });

			await run();

			expect(repo.blockForSafety).toHaveBeenCalledWith('su-1', ['MALWARE'], expect.any(Date));
			expect(incidents.record).toHaveBeenCalledWith(
				expect.objectContaining({
					destinationHost: 'example.com',
					source: 'recheck',
					action: 'blocked',
				}),
			);
			expect(escalation.recordOffence).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_1',
					hosts: ['example.com'],
					source: 'recheck',
					countTowardsLadder: true,
				}),
			);
		});

		it('does not punish a user for leaving an already-blocked link alone', async () => {
			// regression: the blocked row is re-checked daily so the block can self-heal. Before this
			// guard it fell through to the enforce path every run — a fresh incident and a fresh
			// offence every 24h, which would ban somebody for doing nothing.
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({ safetyStatus: 'blocked', isActive: false, safetyBlockedAt: new Date() }),
			]);
			webRisk.lookup.mockResolvedValue({ status: 'unsafe', threatTypes: ['SOCIAL_ENGINEERING'] });

			await run();

			expect(incidents.record).not.toHaveBeenCalled();
			expect(escalation.recordOffence).not.toHaveBeenCalled();
			expect(repo.blockForSafety).not.toHaveBeenCalled();
			// still re-probed, so a Google delisting can lift the block
			expect(repo.markSafetyChecked).toHaveBeenCalledWith(
				'su-1',
				expect.objectContaining({ nextSafetyCheckAt: expect.any(Date) }),
			);
		});

		it('does not block on UNWANTED_SOFTWARE alone', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({ safetyPendingSince: new Date('2026-07-30') }),
			]);
			webRisk.lookup.mockResolvedValue({
				status: 'unsafe',
				threatTypes: ['UNWANTED_SOFTWARE'],
			});

			await run();

			expect(repo.blockForSafety).not.toHaveBeenCalled();
			expect(incidents.record).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'shadow', countedAsOffence: false }),
			);
			expect(escalation.recordOffence).not.toHaveBeenCalled();
		});

		it('records the hostname only, never the full destination URL', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({
					destinationUrl: 'https://phish.example.com/login?session=secret-token',
					safetyPendingSince: new Date('2026-07-30'),
				}),
			]);
			webRisk.lookup.mockResolvedValue({ status: 'unsafe', threatTypes: ['SOCIAL_ENGINEERING'] });

			await run();

			const recorded = incidents.record.mock.calls[0][0];
			expect(recorded.destinationHost).toBe('phish.example.com');
			expect(JSON.stringify(recorded)).not.toContain('secret-token');
		});
	});

	describe('shadow mode', () => {
		beforeEach(() => {
			mockEnv.URL_SAFETY_RECHECK_MODE = 'shadow';
		});

		it('records the finding but disables nothing and notifies nobody', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({ safetyPendingSince: new Date('2026-07-30') }),
			]);
			webRisk.lookup.mockResolvedValue({ status: 'unsafe', threatTypes: ['MALWARE'] });

			await run();

			expect(repo.blockForSafety).not.toHaveBeenCalled();
			expect(incidents.record).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'shadow', countedAsOffence: false }),
			);
			expect(escalation.recordOffence).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'url_safety.block_skipped_shadow',
				expect.objectContaining({ shortCode: 'ab3xz' }),
			);
		});
	});

	describe('blast-radius cap', () => {
		it('stops blocking past the cap and raises an error-level alarm', async () => {
			const many = Array.from({ length: 40 }, (_, i) =>
				shortUrl({
					id: `su-${i}`,
					shortCode: `code${i}`,
					safetyPendingSince: new Date('2026-07-30'),
				}),
			);
			repo.findDueForSafetyCheck.mockResolvedValue(many);
			webRisk.lookup.mockResolvedValue({ status: 'unsafe', threatTypes: ['MALWARE'] });

			await run();

			// The cap is evaluated once per concurrency slice, so a slice already in flight can overshoot
			// by up to CONCURRENCY-1. Assert the real bound rather than a magic number that silently
			// drifts whenever the concurrency is tuned.
			expect(repo.blockForSafety.mock.calls.length).toBeLessThanOrEqual(
				URL_SAFETY_BLOCK_CAP_PER_RUN + URL_SAFETY_RECHECK_CONCURRENCY - 1,
			);
			expect(repo.blockForSafety.mock.calls.length).toBeGreaterThanOrEqual(
				URL_SAFETY_BLOCK_CAP_PER_RUN,
			);
			expect(logger.error).toHaveBeenCalledWith(
				'url_safety.recheck.block_cap_reached',
				expect.objectContaining({ cap: URL_SAFETY_BLOCK_CAP_PER_RUN }),
			);
		});
	});

	describe('offence grouping', () => {
		it('raises one offence per owner per run, deduplicated by host', async () => {
			repo.findDueForSafetyCheck.mockResolvedValue([
				shortUrl({
					id: 'su-1',
					shortCode: 'aaa11',
					destinationUrl: 'https://hacked.example.com/a',
					safetyPendingSince: new Date('2026-07-30'),
				}),
				shortUrl({
					id: 'su-2',
					shortCode: 'bbb22',
					destinationUrl: 'https://hacked.example.com/b',
					safetyPendingSince: new Date('2026-07-30'),
				}),
				shortUrl({
					id: 'su-3',
					shortCode: 'ccc33',
					createdBy: 'user_2',
					destinationUrl: 'https://other.example.com/c',
					safetyPendingSince: new Date('2026-07-30'),
				}),
			]);
			webRisk.lookup.mockResolvedValue({ status: 'unsafe', threatTypes: ['SOCIAL_ENGINEERING'] });

			await run();

			expect(escalation.recordOffence).toHaveBeenCalledTimes(2);
			const forUser1 = escalation.recordOffence.mock.calls.find(
				(call: [{ userId: string }]) => call[0].userId === 'user_1',
			)![0];
			expect(forUser1.hosts).toEqual(['hacked.example.com']);
			expect(forUser1.shortCodes).toEqual(['aaa11', 'bbb22']);
		});
	});

	it('keeps going when one link throws', async () => {
		repo.findDueForSafetyCheck.mockResolvedValue([
			shortUrl({ id: 'su-1' }),
			shortUrl({ id: 'su-2' }),
		]);
		webRisk.lookup.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ status: 'safe' });

		await run();

		expect(logger.error).toHaveBeenCalledWith(
			'url_safety.recheck.item_failed',
			expect.objectContaining({ shortUrlId: 'su-1' }),
		);
		expect(logger.info).toHaveBeenCalledWith(
			'url_safety.recheck.completed',
			expect.objectContaining({ errors: 1 }),
		);
	});

	it('reports the backlog and prunes stale incidents', async () => {
		repo.countDueForSafetyCheck.mockResolvedValue(1234);
		incidents.deleteOlderThan.mockResolvedValue(7);

		await run();

		expect(incidents.deleteOlderThan).toHaveBeenCalledWith(expect.any(Date));
		expect(logger.info).toHaveBeenCalledWith(
			'url_safety.recheck.completed',
			expect.objectContaining({ backlog: 1234, purgedIncidents: 7 }),
		);
	});
});
