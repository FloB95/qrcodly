import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { SubscriptionPastDueEvent } from '@/core/event/subscription-past-due.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';

@EventHandler(SubscriptionPastDueEvent.eventName)
export class SubscriptionPastDueEventHandler extends AbstractEventHandler<SubscriptionPastDueEvent> {
	constructor() {
		super();
	}

	async handle(event: SubscriptionPastDueEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const payer = event.data.payer;

		if (!payer) {
			logger.error('error:subscription.pastDue.missingPayer', {
				subscription: {
					subscriptionId: event.data.id,
				},
			});
			return;
		}

		logger.info('subscription.pastDue', {
			subscription: {
				userId: payer.id,
				periodEnd: event.data.period_end,
				pastDue: event.data.past_due_at,
			},
		});

		try {
			const template = await mailer.getTemplate('subscription-past-due');
			const html = template({
				firstName: payer.first_name || 'there',
				billingUrl: `${env.FRONTEND_URL}/settings/billing`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: payer.email,
				subject: 'Action Required: Your QRcodly Payment is Past Due',
				html,
			});

			logger.info('subscription.pastDueEmailSent', {
				subscription: {
					userId: payer.id,
					email: payer.email,
				},
			});
		} catch (error) {
			logger.error('subscription.pastDueEmailFailed', {
				subscription: {
					userId: payer.id,
					email: payer.email,
				},
				error: error as Error,
			});
		}
	}
}
