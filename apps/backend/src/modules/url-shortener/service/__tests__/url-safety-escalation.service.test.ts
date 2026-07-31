import 'reflect-metadata';
import { mock } from 'jest-mock-extended';
import type { Logger } from '@/core/logging';
import type { UserBanService } from '@/core/auth';
import type { Mailer } from '@/core/mailer/mailer';
import type UserSafetyStandingRepository from '../../domain/repository/user-safety-standing.repository';
import type { TUserSafetyStanding } from '../../domain/entities/user-safety-standing.entity';
import { daysAgo } from '@/core/utils/date';

const mockGetUser = jest.fn();
jest.mock('@clerk/fastify', () => ({
	clerkClient: { users: { updateUserMetadata: jest.fn() } },
	createClerkClient: jest.fn(() => ({ users: { getUser: mockGetUser } })),
}));

jest.mock('@/core/config/env', () => ({
	env: { FRONTEND_URL: 'https://test.qrcodly.de', CLERK_SECRET_KEY: 'sk_test' },
}));

import { UrlSafetyEscalationService } from '../url-safety-escalation.service';

const standing = (overrides: Partial<TUserSafetyStanding> = {}): TUserSafetyStanding => ({
	userId: 'user_1',
	offenceCount: 0,
	firstOffenceAt: null,
	lastOffenceAt: null,
	warnedAt: null,
	warningEmailSentAt: null,
	bannedAt: null,
	createdAt: new Date(),
	updatedAt: null,
	...overrides,
});

describe('UrlSafetyEscalationService', () => {
	let service: UrlSafetyEscalationService;
	let repo: jest.Mocked<UserSafetyStandingRepository>;
	let banService: jest.Mocked<UserBanService>;
	let mailer: jest.Mocked<Mailer>;
	let logger: jest.Mocked<Logger>;

	const base = {
		userId: 'user_1',
		hosts: ['evil.example.com'],
		threatTypes: ['SOCIAL_ENGINEERING'],
	};

	beforeEach(() => {
		repo = mock<UserSafetyStandingRepository>();
		banService = mock<UserBanService>();
		mailer = mock<Mailer>();
		logger = mock<Logger>();

		mailer.getTemplate.mockResolvedValue(() => '<html></html>');
		mailer.sendMail.mockResolvedValue(undefined);
		mockGetUser.mockResolvedValue({
			emailAddresses: [{ emailAddress: 'user@example.com' }],
			firstName: 'Alex',
		});

		service = new UrlSafetyEscalationService(repo, banService, mailer, logger);
	});

	afterEach(() => jest.clearAllMocks());

	describe('first offence', () => {
		it('warns instead of banning and sends the warning mail', async () => {
			repo.findOrCreate.mockResolvedValue(standing());

			const result = await service.recordOffence({ ...base, source: 'create' });

			expect(result).toMatchObject({ outcome: 'warned', offenceCount: 1, banned: false });
			expect(banService.ban).not.toHaveBeenCalled();
			expect(mailer.getTemplate).toHaveBeenCalledWith('url-safety-link-blocked');
			expect(repo.markWarningEmailSent).toHaveBeenCalledWith('user_1');
		});

		it('stamps warnedAt so the next offence escalates', async () => {
			repo.findOrCreate.mockResolvedValue(standing());

			await service.recordOffence({ ...base, source: 'create' });

			const updates = repo.update.mock.calls[0][1];
			expect(updates.warnedAt).toBeInstanceOf(Date);
			expect(updates.offenceCount).toBe(1);
		});
	});

	describe('within the allowance', () => {
		it.each([1, 2])('offence %i is warned, never banned', async (prior) => {
			repo.findOrCreate.mockResolvedValue(
				standing({ offenceCount: prior, warnedAt: daysAgo(2), lastOffenceAt: daysAgo(2) }),
			);

			const result = await service.recordOffence({ ...base, source: 'create' });

			expect(result.outcome).toBe('warned');
			expect(banService.ban).not.toHaveBeenCalled();
		});
	});

	describe('once the allowance is used up', () => {
		// URL_SAFETY_OFFENCES_BEFORE_BAN = 3 → the fourth offence is the first that can ban
		const warned = standing({
			offenceCount: 3,
			warnedAt: daysAgo(2),
			lastOffenceAt: daysAgo(2),
			firstOffenceAt: daysAgo(2),
		});

		it.each(['create', 'update', 'duplicate'] as const)(
			'bans when the user actively supplied the destination again (%s)',
			async (source) => {
				repo.findOrCreate.mockResolvedValue(warned);
				repo.findOneById.mockResolvedValue(warned);

				const result = await service.recordOffence({ ...base, source });

				expect(result).toMatchObject({ outcome: 'banned', banned: true, offenceCount: 4 });
				expect(banService.ban).toHaveBeenCalledWith(
					'user_1',
					expect.objectContaining({
						reason: 'repeated-malicious-destination-urls',
						source: 'system:web-risk',
					}),
				);
				expect(mailer.getTemplate).toHaveBeenCalledWith('url-safety-account-banned');
				expect(mailer.getTemplate).toHaveBeenCalledWith('url-safety-admin-alert');
			},
		);

		it('does NOT auto-ban a background re-check finding — a hacked third-party site is not abuse', async () => {
			repo.findOrCreate.mockResolvedValue(warned);

			const result = await service.recordOffence({ ...base, source: 'recheck' });

			expect(result).toMatchObject({ outcome: 'escalated_to_admin', banned: false });
			expect(banService.ban).not.toHaveBeenCalled();
			expect(mailer.getTemplate).toHaveBeenCalledWith('url-safety-admin-alert');
		});
	});

	describe('rolling window', () => {
		it('resets the counter when the last offence fell out of the 90-day window', async () => {
			repo.findOrCreate.mockResolvedValue(
				standing({ offenceCount: 1, warnedAt: daysAgo(200), lastOffenceAt: daysAgo(200) }),
			);

			const result = await service.recordOffence({ ...base, source: 'create' });

			expect(result).toMatchObject({ outcome: 'warned', offenceCount: 1 });
			expect(banService.ban).not.toHaveBeenCalled();
		});

		it('re-arms the warning mail after a window reset', async () => {
			repo.findOrCreate.mockResolvedValue(
				standing({
					offenceCount: 1,
					warnedAt: daysAgo(200),
					lastOffenceAt: daysAgo(200),
					warningEmailSentAt: daysAgo(200),
				}),
			);

			await service.recordOffence({ ...base, source: 'create' });

			expect(repo.update.mock.calls[0][1].warningEmailSentAt).toBeNull();
		});
	});

	describe('resilience', () => {
		it('does not ban — and does not throw — when Clerk fails', async () => {
			const warned = standing({ offenceCount: 3, warnedAt: daysAgo(1), lastOffenceAt: daysAgo(1) });
			repo.findOrCreate.mockResolvedValue(warned);
			banService.ban.mockRejectedValue(new Error('clerk down'));

			const result = await service.recordOffence({ ...base, source: 'create' });

			expect(result).toMatchObject({ outcome: 'escalated_to_admin', banned: false });
			expect(logger.error).toHaveBeenCalledWith(
				'url_safety.ban_failed',
				expect.objectContaining({ userId: 'user_1' }),
			);
		});

		it('swallows an SMTP failure so a block is never lost', async () => {
			repo.findOrCreate.mockResolvedValue(standing());
			mailer.sendMail.mockRejectedValue(new Error('smtp down'));

			const result = await service.recordOffence({ ...base, source: 'create' });

			expect(result.outcome).toBe('warned');
			expect(logger.error).toHaveBeenCalledWith(
				'url_safety.notify_failed',
				expect.objectContaining({ kind: 'link-blocked' }),
			);
			// the flag stays unset so it is visible that this user was never reached
			expect(repo.markWarningEmailSent).not.toHaveBeenCalled();
		});

		it('skips mail when the account has no email address', async () => {
			repo.findOrCreate.mockResolvedValue(standing());
			mockGetUser.mockResolvedValue({ emailAddresses: [], firstName: null });

			const result = await service.recordOffence({ ...base, source: 'create' });

			expect(result.outcome).toBe('warned');
			expect(mailer.sendMail).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'url_safety.notify_no_email',
				expect.objectContaining({ userId: 'user_1' }),
			);
		});
	});

	describe('shadow mode', () => {
		it('records nothing on the ladder and sends no mail', async () => {
			const result = await service.recordOffence({
				...base,
				source: 'recheck',
				countTowardsLadder: false,
			});

			expect(result).toMatchObject({ outcome: 'not_counted', banned: false });
			expect(repo.findOrCreate).not.toHaveBeenCalled();
			expect(repo.update).not.toHaveBeenCalled();
			expect(mailer.sendMail).not.toHaveBeenCalled();
			expect(banService.ban).not.toHaveBeenCalled();
		});
	});

	describe('clearStanding', () => {
		it('resets the ladder and lifts the ban', async () => {
			await service.clearStanding('user_1');

			expect(repo.reset).toHaveBeenCalledWith('user_1');
			expect(banService.unban).toHaveBeenCalledWith('user_1');
		});
	});
});
