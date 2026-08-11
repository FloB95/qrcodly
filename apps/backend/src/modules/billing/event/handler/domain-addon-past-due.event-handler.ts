import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { DomainAddonPastDueEvent } from '@/core/event/domain-addon-past-due.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';

@EventHandler(DomainAddonPastDueEvent.eventName)
export class DomainAddonPastDueEventHandler extends AbstractEventHandler<DomainAddonPastDueEvent> {
	constructor() {
		super();
	}

	async handle(event: DomainAddonPastDueEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const addonSubscriptionRepository = container.resolve(UserAddonSubscriptionRepository);
		const { userId, email, firstName } = event.data;

		if (!userId) {
			logger.error('error:domainAddon.pastDue.missingUserId', {
				subscription: { stripeSubscriptionId: event.data.stripeSubscriptionId },
			});
			return;
		}

		try {
			const addon = await addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain');
			if (addon?.pastDueNotifiedAt) {
				logger.info('domainAddon.pastDue.alreadyNotified', { subscription: { userId } });
				return;
			}

			// The Pro past-due copy is product-neutral, so it is reused rather than duplicated.
			// Idempotency keys off the add-on row, so a user can get one notice per subscription.
			const template = await mailer.getTemplate('subscription-past-due');
			const html = template({
				firstName: firstName || 'there',
				billingUrl: `${env.FRONTEND_URL}/dashboard/settings/billing`,
				logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: email,
				subject: 'Action Required: Payment Failed for Your QRcodly Extra Domains',
				html,
				template: 'subscription-past-due',
			});

			if (addon) {
				await addonSubscriptionRepository.markPastDueNotified(addon);
			}

			logger.info('domainAddon.pastDueEmailSent', { subscription: { userId, email } });
		} catch (error) {
			logger.error('domainAddon.pastDueEmailFailed', {
				subscription: { userId, email },
				error: error as Error,
			});
		}
	}
}
