import { injectable, container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { env } from '@/core/config/env';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { EnforceCustomDomainLimitUseCase } from '../useCase/enforce-custom-domain-limit.use-case';

/**
 * Brings every user's custom domains back in line with what they are entitled to.
 *
 * Everywhere else, enforcement hangs off an event: a quantity change, a checkout, a grace period
 * expiring. That leaves a hole — entitlement can drop with no event ever reaching us. A lost
 * `customer.subscription.updated`, a Pro plan that lapsed, an add-on cancelled in the Stripe
 * portal, or a schedule phase Stripe applied while our webhook endpoint was down all end with the
 * user keeping domains they no longer pay for, indefinitely.
 *
 * Deliberately not folded into the Stripe reconciliation job: that one only touches users who
 * have a subscription row to compare against, while this has to reach users whose subscription
 * disappeared entirely. It is also idempotent and cheap, so it can run far more often.
 */
@injectable()
@CronJob()
export class EnforceCustomDomainLimitsCronJob extends AbstractCronJob {
	schedule = env.CRON_CUSTOM_DOMAIN_LIMITS;

	protected async execute(): Promise<void> {
		const customDomainRepository = container.resolve(CustomDomainRepository);
		const enforceCustomDomainLimitUseCase = container.resolve(EnforceCustomDomainLimitUseCase);

		const userIds = await customDomainRepository.findUserIdsWithDomains();
		if (userIds.length === 0) {
			this.logger.debug('No custom domains to check');
			return;
		}

		let disabledTotal = 0;
		let enabledTotal = 0;
		let errors = 0;

		for (const userId of userIds) {
			try {
				const { enabled, disabled } = await enforceCustomDomainLimitUseCase.execute(userId);
				enabledTotal += enabled.length;
				disabledTotal += disabled.length;

				// Warn, not info: reaching this means the domains outlived the entitlement and every
				// event-driven path missed it.
				if (disabled.length > 0) {
					this.logger.warn('customDomain.limitSweep.disabled', {
						customDomain: { userId, disabled },
					});
				}
				if (enabled.length > 0) {
					this.logger.info('customDomain.limitSweep.enabled', {
						customDomain: { userId, enabled },
					});
				}
			} catch (e) {
				const err = e instanceof Error ? e : new Error(String(e));
				errors++;
				this.logger.error('customDomain.limitSweep.error', {
					customDomain: { userId },
					error: { message: err.message, name: err.name },
				});
			}
		}

		this.logger.info('customDomain.limitSweep.complete', {
			customDomain: { checked: userIds.length, enabledTotal, disabledTotal, errors },
		});
	}
}
