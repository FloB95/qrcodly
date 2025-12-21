import { KeyCache } from '@/core/cache';
import { inject, injectable } from 'tsyringe';

@injectable()
export class UsageRepository {
	constructor(@inject(KeyCache) private keyCache: KeyCache) {}

	private getKey(userId: string, limitKey: string) {
		const day = new Date().toISOString().split('T')[0];
		return `limit:${userId}:${limitKey}:${day}`;
	}

	async getUsage(userId: string, limitKey: string): Promise<number> {
		const key = this.getKey(userId, limitKey);
		const value = (await this.keyCache.get(key)) as string | null;
		return value ? parseInt(value, 10) : 0;
	}

	async increment(userId: string, limitKey: string) {
		const key = this.getKey(userId, limitKey);
		let currentUsage = await this.getUsage(userId, limitKey);
		await this.keyCache.set(key, currentUsage++, 86400); // 1 day expiration
	}
}
