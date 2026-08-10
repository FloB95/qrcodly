import { injectable, container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { env } from '@/core/config/env';
import { Mailer } from '@/core/mailer/mailer';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { ApplyPendingAddonQuantityUseCase } from '../useCase/apply-pending-addon-quantity.use-case';

/**
 * Lands scheduled add-on reductions whose billing period has ended.
 *
 * The renewal webhook normally gets there first; this is the safety net for a webhook that never
 * arrived, and the place the "your slots were reduced" email is sent from.
 */
@injectable()
@CronJob()
export class ApplyPendingAddonQuantityCronJob extends AbstractCronJob {
	// Run every day at 1:00 AM, ahead of the grace-period sweep at 3:00
	schedule = '0 1 * * *';

	protected async execute(): Promise<void> {
		const addonSubscriptionRepository = container.resolve(UserAddonSubscriptionRepository);
		const applyPendingAddonQuantityUseCase = container.resolve(ApplyPendingAddonQuantityUseCase);
		const clerkUserInfoService = container.resolve(ClerkUserInfoService);
		const mailer = container.resolve(Mailer);

		const due = await addonSubscriptionRepository.findDuePendingQuantities();
		if (due.length === 0) {
			this.logger.debug('No pending add-on quantity changes to apply');
			return;
		}

		this.logger.info(`Applying ${due.length} pending add-on quantity changes`);

		for (const subscription of due) {
			try {
				const { quantity, disabled } = await applyPendingAddonQuantityUseCase.execute(subscription);

				const { email, firstName } = await clerkUserInfoService.getUserInfo(subscription.userId);
				if (!email) continue;

				const template = await mailer.getTemplate('domain-addon-quantity-reduced');
				const html = template({
					firstName: firstName || 'there',
					quantity,
					isSingular: quantity === 1,
					affectedDomains: disabled,
					hasAffectedDomains: disabled.length > 0,
					domainsUrl: `${env.FRONTEND_URL}/dashboard/settings/domains`,
					logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
					year: new Date().getFullYear(),
				});

				await mailer.sendMail({
					to: email,
					subject: 'Your QRcodly Extra Domains Have Been Updated',
					html,
					template: 'domain-addon-quantity-reduced',
				});
			} catch (error) {
				this.logger.error('domainAddon.applyPendingQuantityFailed', {
					subscription: { userId: subscription.userId },
					error: error as Error,
				});
			}
		}
	}
}
