import 'reflect-metadata';
import { UserBanService } from '../user-ban.service';
import type { KeyCache } from '@/core/cache';
import type { Logger } from '@/core/logging';
import { mock } from 'jest-mock-extended';
import { clerkClient } from '@clerk/fastify';

jest.mock('@clerk/fastify', () => ({
	clerkClient: { users: { updateUserMetadata: jest.fn().mockResolvedValue({}) } },
}));

describe('UserBanService', () => {
	let service: UserBanService;
	let mockCache: jest.Mocked<KeyCache>;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockCache = mock<KeyCache>();
		mockCache.set.mockResolvedValue();
		mockLogger = mock<Logger>();
		service = new UserBanService(mockCache, mockLogger);
	});

	afterEach(() => jest.clearAllMocks());

	it('sets banned=true in Clerk private metadata (merge) with an audit reason', async () => {
		await service.ban('user_123', {
			reason: 'repeated-malicious-destination-urls',
			source: 'system:web-risk',
			details: { violationCount: 3 },
		});

		expect(clerkClient.users.updateUserMetadata).toHaveBeenCalledWith('user_123', {
			privateMetadata: expect.objectContaining({
				banned: true,
				bannedReason: 'repeated-malicious-destination-urls',
				bannedBy: 'system:web-risk',
			}),
		});
	});

	it('primes the ban cache key so the ban takes effect on the next request', async () => {
		await service.ban('user_123', { reason: 'r', source: 's' });

		expect(mockCache.set).toHaveBeenCalledWith('user_ban:user_123', 1, 60);
	});

	it('logs who and why for audit at info level', async () => {
		await service.ban('user_123', {
			reason: 'repeated-malicious-destination-urls',
			source: 'system:web-risk',
			details: { violationCount: 3 },
		});

		expect(mockLogger.info).toHaveBeenCalledWith(
			'user.banned',
			expect.objectContaining({
				userId: 'user_123',
				reason: 'repeated-malicious-destination-urls',
				source: 'system:web-risk',
			}),
		);
	});

	it('unban clears the Clerk ban flag, drops the cache, and logs the unban', async () => {
		await service.unban('user_123');

		expect(clerkClient.users.updateUserMetadata).toHaveBeenCalledWith('user_123', {
			privateMetadata: expect.objectContaining({ banned: false }),
		});
		expect(mockCache.del).toHaveBeenCalledWith('user_ban:user_123');
		expect(mockLogger.info).toHaveBeenCalledWith('user.unbanned', { userId: 'user_123' });
	});
});
