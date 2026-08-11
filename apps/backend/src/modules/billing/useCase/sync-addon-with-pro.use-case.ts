import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import UserAddonSubscriptionRepository from '../domain/repository/user-addon-subscription.repository';
import { StripeService } from '../service/stripe.service';

/**
 * Keeps the domain add-on in step with the Pro plan it depends on.
 *
 * Purchased slots grant nothing without Pro, so letting the add-on bill on after Pro ends would
 * charge for something the customer cannot use. It is always scheduled to the end of the paid
 * period and never cancelled outright — an immediate cancellation would produce a credit, and
 * this product never refunds.
 */
@injectable()
export class SyncAddonWithProUseCase {
	constructor(
		@inject(UserAddonSubscriptionRepository)
		private addonSubscriptionRepository: UserAddonSubscriptionRepository,
		@inject(StripeService) private stripeService: StripeService,
		@inject(Logger) private logger: Logger,
	) {}

	/** Pro is ending — let the add-on run out with it. */
	async cancelAtPeriodEnd(userId: string): Promise<void> {
		await this.setCancelAtPeriodEnd(userId, true);
	}

	/** Pro was kept after all — keep the add-on too. */
	async resume(userId: string): Promise<void> {
		await this.setCancelAtPeriodEnd(userId, false);
	}

	private async setCancelAtPeriodEnd(userId: string, cancelAtPeriodEnd: boolean): Promise<void> {
		const addon = await this.addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain');

		if (!addon || addon.status === 'canceled' || addon.cancelAtPeriodEnd === cancelAtPeriodEnd) {
			return;
		}

		try {
			// Stripe refuses cancellation changes while a subscription schedule owns the
			// subscription. Without this the failure would be swallowed below and the add-on would
			// keep billing after Pro ended.
			const state = await this.stripeService.getAddonSubscriptionState(addon.stripeSubscriptionId);
			if (state.scheduleId) {
				await this.stripeService.releaseSchedule(state.scheduleId);
				await this.addonSubscriptionRepository.clearScheduledQuantity(addon);
			}

			await this.stripeService.setCancelAtPeriodEnd(addon.stripeSubscriptionId, cancelAtPeriodEnd);
			// Stripe will echo this back through a webhook; writing it now keeps the dashboard honest
			// in the meantime.
			await this.addonSubscriptionRepository.update(addon, { cancelAtPeriodEnd });

			this.logger.info('domainAddon.syncedWithPro', {
				subscription: { userId, cancelAtPeriodEnd },
			});
		} catch (error) {
			this.logger.error('domainAddon.syncWithProFailed', {
				subscription: { userId, cancelAtPeriodEnd },
				error: error as Error,
			});
		}
	}
}
