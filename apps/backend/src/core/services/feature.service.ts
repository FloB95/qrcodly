import { singleton } from 'tsyringe';
import { LIMITED_FEATURES, LimitedFeature } from '../config/limited-features';
import { PlanName } from '../config/plan.config';

@singleton()
export class FeatureService {
	getLimit(plan: PlanName, featureKey: LimitedFeature): number | null {
		return LIMITED_FEATURES[plan]?.[featureKey] ?? 0;
	}
}
