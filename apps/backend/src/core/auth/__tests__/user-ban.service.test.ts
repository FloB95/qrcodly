import 'reflect-metadata';
import { UserBanService } from '../user-ban.service';
import type { KeyCache } from '@/core/cache';
import type { Logger } from '@/core/logging';
import type { EventEmitter } from '@/core/event';
import { UserBannedEvent } from '@/core/event/user-banned.event';
import { mock } from 'jest-mock-extended';
import { clerkClient } from '@clerk/fastify';

jest.mock('@clerk/fastify', () => ({
	clerkClient: { users: { updateUserMetadata: jest.fn().mockResolvedValue({}) } },
}));

describe('UserBanService', () => {
	let service: UserBanService;
	let mockCache: jest.Mocked<KeyCache>;
	let mockLogger: jest.Mocked<Logger>;
	let mockEventEmitter: jest.Mocked<EventEmitter>;

	beforeEach(() => {
		mockCache = mock<KeyCache>();
		mockCache.set.mockResolvedValue();
		mockLogger = mock<Logger>();
		mockEventEmitter = mock<EventEmitter>();
		service = new UserBanService(mockCache, mockLogger, mockEventEmitter);
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

	it('emits UserBannedEvent after the ban is stored in Clerk', async () => {
		await service.ban('user_123', { reason: 'r', source: 's' });

		expect(mockEventEmitter.emit).toHaveBeenCalledWith(new UserBannedEvent({ id: 'user_123' }));
		expect(mockEventEmitter.emit.mock.invocationCallOrder[0]).toBeGreaterThan(
			(clerkClient.users.updateUserMetadata as jest.Mock).mock.invocationCallOrder[0],
		);
	});

	it('emits nothing when Clerk rejects the ban', async () => {
		(clerkClient.users.updateUserMetadata as jest.Mock).mockRejectedValueOnce(new Error('down'));

		await expect(service.ban('user_123', { reason: 'r', source: 's' })).rejects.toThrow('down');

		expect(mockEventEmitter.emit).not.toHaveBeenCalled();
	});

	it('emits nothing on unban', async () => {
		await service.unban('user_123');

		expect(mockEventEmitter.emit).not.toHaveBeenCalled();
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
