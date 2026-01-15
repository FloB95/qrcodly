import { inject, singleton } from 'tsyringe';
import { UsageRepository } from '../domain/repository/usage.repository';

@singleton()
export class UsageService {
	constructor(@inject(UsageRepository) private usageRepository: UsageRepository) {}

	async increment(userId: string, limitKey: string): Promise<void> {
		await this.usageRepository.increment(userId, limitKey);
	}

	async count(userId: string, limitKey: string): Promise<number> {
		return await this.usageRepository.getUsage(userId, limitKey);
	}
}
