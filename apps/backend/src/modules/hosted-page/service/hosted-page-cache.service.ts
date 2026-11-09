import { inject, singleton } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import { type TPublicHostedPageResponseDto } from '@shared/schemas';
import {
	HOSTED_PAGE_CACHE_KEY_PREFIX,
	HOSTED_PAGE_CACHE_TTL_SECONDS,
	HOSTED_PAGE_CACHE_USER_TAG_PREFIX,
} from '@/modules/hosted-page/config/constants';

/**
 * Short-lived cache for public page payloads. Entries are tagged per owner so a plan change can
 * drop every page of a user at once — that is how pages go offline and come back with the Pro
 * features without waiting for the TTL.
 */
@singleton()
export class HostedPageCacheService {
	constructor(@inject(KeyCache) private readonly keyCache: KeyCache) {}

	private pageKey(shortCode: string): string {
		return `${HOSTED_PAGE_CACHE_KEY_PREFIX}${shortCode}`;
	}

	private userTag(userId: string): string {
		return `${HOSTED_PAGE_CACHE_USER_TAG_PREFIX}${userId}`;
	}

	async get(shortCode: string): Promise<TPublicHostedPageResponseDto | null> {
		const cached = await this.keyCache.get(this.pageKey(shortCode));
		if (typeof cached !== 'string') return null;
		try {
			return JSON.parse(cached) as TPublicHostedPageResponseDto;
		} catch {
			return null;
		}
	}

	async set(shortCode: string, userId: string, page: TPublicHostedPageResponseDto): Promise<void> {
		await this.keyCache.set(
			this.pageKey(shortCode),
			JSON.stringify(page),
			HOSTED_PAGE_CACHE_TTL_SECONDS,
			[this.userTag(userId)],
		);
	}

	async invalidateShortCode(shortCode: string): Promise<void> {
		await this.keyCache.del(this.pageKey(shortCode));
	}

	async invalidateUser(userId: string): Promise<void> {
		await this.keyCache.invalidateTag(this.userTag(userId));
	}
}
