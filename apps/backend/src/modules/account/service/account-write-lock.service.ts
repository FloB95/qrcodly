import { inject, singleton } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import AccountDeletionRequestRepository from '../domain/repository/account-deletion-request.repository';

const CACHE_TTL_SECONDS = 60;
const cacheKey = (userId: string) => `account_write_lock:${userId}`;

/**
 * Answers whether an account is read-only because its owner confirmed a deletion request. That is
 * asked before every creating or changing request, so the answer is cached. Confirming and
 * withdrawing drop the entry, which makes both take effect at once. The short lifetime only bounds
 * how long a wrong answer can live if that drop is lost or overtaken by a lookup running at the
 * same moment. Without Redis every question goes to the database.
 */
@singleton()
export class AccountWriteLockService {
	constructor(
		@inject(KeyCache) private readonly cache: KeyCache,
		@inject(AccountDeletionRequestRepository)
		private readonly repository: AccountDeletionRequestRepository,
	) {}

	async isLocked(userId: string): Promise<boolean> {
		const cached = await this.cache.get(cacheKey(userId));
		if (cached !== null) return cached === 1 || cached === '1';

		const locked = !!(await this.repository.findConfirmedByUserId(userId));
		await this.cache.set(cacheKey(userId), locked ? 1 : 0, CACHE_TTL_SECONDS);
		return locked;
	}

	/** Forget the cached answer: call after a request was confirmed or withdrawn. */
	async forget(userId: string): Promise<void> {
		await this.cache.del(cacheKey(userId));
	}
}
