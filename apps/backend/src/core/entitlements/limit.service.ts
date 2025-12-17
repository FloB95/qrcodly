import { inject, injectable } from 'tsyringe';
import { LimitKey, PlanName, PLANS } from './plan.config';
import { UsageRepository } from '../domain/repository/usage.repository';
import { PlanLimitExceededError } from '../error/http/plan-limit-exceeded.error';

@injectable()
export class LimitService {
	constructor(@inject(UsageRepository) private usageRepository: UsageRepository) {}

	async assertLimit(userId: string, plan: PlanName, limitKey: LimitKey) {
		const limit = PLANS[plan]?.limits?.[limitKey];
		if (!limit) return;

		const used = await this.usageRepository.getUsage(userId, limitKey);
		if (used >= limit) {
			throw new PlanLimitExceededError(limitKey, limit);
		}
	}

	async incrementUsage(userId: string, limitKey: string) {
		await this.usageRepository.increment(userId, limitKey);
	}
}
