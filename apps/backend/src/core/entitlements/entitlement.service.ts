import { injectable } from 'tsyringe';
import { PlanKey, PLANS } from './plan.config';
import { UnauthorizedError } from '@/core/error/http';

@injectable()
export class EntitlementService {
	assertCan(user: { plan: PlanKey } | null, entitlement: string) {
		const planKey = user?.plan ?? 'anonymous';
		const plan = PLANS[planKey];

		if (!plan.entitlements.includes(entitlement)) {
			throw new UnauthorizedError(`Missing entitlement: ${entitlement}`);
		}
	}

	list(planKey: string) {
		return PLANS[planKey];
	}
}
