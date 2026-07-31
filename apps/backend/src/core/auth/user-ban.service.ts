import { inject, singleton } from 'tsyringe';
import { clerkClient } from '@clerk/fastify';
import { KeyCache } from '@/core/cache';
import { Logger } from '@/core/logging';
import { trackExternal } from '@/core/metrics';

const USER_BAN_CACHE_TTL = 60;
const banCacheKey = (userId: string) => `user_ban:${userId}`;

export interface BanUserParams {
	reason: string;
	source: string;
	details?: Record<string, unknown>;
}

@singleton()
export class UserBanService {
	constructor(
		@inject(KeyCache) private readonly cache: KeyCache,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async ban(userId: string, params: BanUserParams): Promise<void> {
		const bannedAt = new Date().toISOString();

		await trackExternal('clerk', 'users.updateUserMetadata', () =>
			clerkClient.users.updateUserMetadata(userId, {
				privateMetadata: {
					banned: true,
					bannedAt,
					bannedReason: params.reason,
					bannedBy: params.source,
					banDetails: params.details ?? null,
				},
			}),
		);

		await this.cache.set(banCacheKey(userId), 1, USER_BAN_CACHE_TTL);

		this.logger.info('user.banned', {
			userId,
			reason: params.reason,
			source: params.source,
			bannedAt,
			...params.details,
		});
	}

	async unban(userId: string): Promise<void> {
		await trackExternal('clerk', 'users.updateUserMetadata', () =>
			clerkClient.users.updateUserMetadata(userId, {
				privateMetadata: {
					banned: false,
					bannedReason: null,
					bannedAt: null,
					bannedBy: null,
					banDetails: null,
				},
			}),
		);

		await this.cache.del(banCacheKey(userId));

		this.logger.info('user.unbanned', { userId });
	}
}
