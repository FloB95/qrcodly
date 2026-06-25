import 'reflect-metadata';
import { UrlSafetyViolationTracker } from '../url-safety-violation-tracker.service';
import type { KeyCache } from '@/core/cache';
import type { Logger } from '@/core/logging';
import type { UserBanService } from '@/core/auth';
import { mock } from 'jest-mock-extended';

// UserBanService (transitively imported) pulls in @clerk/fastify — keep it inert.
jest.mock('@clerk/fastify', () => ({
	clerkClient: { users: { updateUserMetadata: jest.fn() } },
}));

const COUNT_KEY = 'url_safety:violations:user_123';

describe('UrlSafetyViolationTracker', () => {
	let tracker: UrlSafetyViolationTracker;
	let mockCache: jest.Mocked<KeyCache>;
	let mockLogger: jest.Mocked<Logger>;
	let mockUserBanService: jest.Mocked<UserBanService>;
	let mockRedis: {
		incr: jest.Mock;
		expire: jest.Mock;
		rpush: jest.Mock;
		ltrim: jest.Mock;
		lrange: jest.Mock;
		del: jest.Mock;
	};

	const userId = 'user_123';

	beforeEach(() => {
		mockRedis = {
			incr: jest.fn().mockResolvedValue(1),
			expire: jest.fn().mockResolvedValue(1),
			rpush: jest.fn().mockResolvedValue(1),
			ltrim: jest.fn().mockResolvedValue('OK'),
			lrange: jest.fn().mockResolvedValue([]),
			del: jest.fn().mockResolvedValue(1),
		};
		mockCache = mock<KeyCache>();
		mockCache.getClient.mockReturnValue(mockRedis as never);
		mockLogger = mock<Logger>();
		mockUserBanService = mock<UserBanService>();
		mockUserBanService.ban.mockResolvedValue();
		tracker = new UrlSafetyViolationTracker(mockCache, mockLogger, mockUserBanService);
	});

	afterEach(() => jest.clearAllMocks());

	it('records the first violation, sets the window TTL on the counter, and does not ban', async () => {
		mockRedis.incr.mockResolvedValue(1);

		const result = await tracker.recordViolation(
			userId,
			'https://bad.example.com',
			['MALWARE'],
			'create',
		);

		expect(mockRedis.incr).toHaveBeenCalledWith(COUNT_KEY);
		expect(mockRedis.expire).toHaveBeenCalledWith(COUNT_KEY, expect.any(Number));
		expect(mockUserBanService.ban).not.toHaveBeenCalled();
		expect(result).toEqual({ banned: false, violationCount: 1 });
	});

	it('does not reset the counter TTL on the second violation and does not ban', async () => {
		mockRedis.incr.mockResolvedValue(2);

		const result = await tracker.recordViolation(
			userId,
			'https://bad2.example.com',
			['SOCIAL_ENGINEERING'],
			'update',
		);

		// The counter key TTL is only set on the first increment; the URL trail still gets its own TTL.
		expect(mockRedis.expire).not.toHaveBeenCalledWith(COUNT_KEY, expect.any(Number));
		expect(mockUserBanService.ban).not.toHaveBeenCalled();
		expect(result).toEqual({ banned: false, violationCount: 2 });
	});

	it('bans the user on the third violation with an auditable reason and URL trail', async () => {
		mockRedis.incr.mockResolvedValue(3);
		mockRedis.lrange.mockResolvedValue([
			JSON.stringify({ url: 'https://a.example.com', threatTypes: ['MALWARE'], context: 'create' }),
			JSON.stringify({
				url: 'https://b.example.com',
				threatTypes: ['SOCIAL_ENGINEERING'],
				context: 'create',
			}),
			JSON.stringify({
				url: 'https://c.example.com',
				threatTypes: ['UNWANTED_SOFTWARE'],
				context: 'update',
			}),
		]);

		const result = await tracker.recordViolation(
			userId,
			'https://c.example.com',
			['UNWANTED_SOFTWARE'],
			'update',
		);

		expect(mockUserBanService.ban).toHaveBeenCalledWith(
			userId,
			expect.objectContaining({
				reason: 'repeated-malicious-destination-urls',
				source: 'system:web-risk',
				details: expect.objectContaining({
					violationCount: 3,
					flaggedUrls: expect.arrayContaining([
						expect.objectContaining({ url: 'https://a.example.com' }),
					]),
				}),
			}),
		);
		// Counter + trail are cleared after a ban so a manual unban gets a fresh budget.
		expect(mockRedis.del).toHaveBeenCalledWith('url_safety:violations:user_123');
		expect(mockRedis.del).toHaveBeenCalledWith('url_safety:violations:urls:user_123');
		expect(result).toEqual({ banned: true, violationCount: 3 });
	});

	it('logs every violation for audit (who + which URL + threat + count)', async () => {
		mockRedis.incr.mockResolvedValue(1);

		await tracker.recordViolation(userId, 'https://bad.example.com', ['MALWARE'], 'create');

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'url_safety.violation',
			expect.objectContaining({
				userId,
				destinationUrl: 'https://bad.example.com',
				threatTypes: ['MALWARE'],
				violationCount: 1,
				context: 'create',
			}),
		);
	});

	it('clearViolations deletes the counter and URL-trail keys (used on ban / unban)', async () => {
		await tracker.clearViolations(userId);

		expect(mockRedis.del).toHaveBeenCalledWith('url_safety:violations:user_123');
		expect(mockRedis.del).toHaveBeenCalledWith('url_safety:violations:urls:user_123');
	});
});
