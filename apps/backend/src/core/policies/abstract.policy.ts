import { FeatureService } from '@/core/services/feature.service';
import { UsageService } from '@/core/services/usage.service';
import { container } from 'tsyringe';

export abstract class AbstractPolicy {
	protected readonly featureService: FeatureService;
	protected readonly usageService: UsageService;

	constructor() {
		this.featureService = container.resolve(FeatureService);
		this.usageService = container.resolve(UsageService);
	}

	abstract checkAccess(...args: any[]): boolean | Promise<boolean>;
}
