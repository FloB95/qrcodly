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

		logger.info('subscription.pastDue', {
			userId: event.data.userId,
			email: event.data.email,
		});

		try {
			const template = await mailer.getTemplate('subscription-past-due');
			const html = template({
				firstName: event.data.firstName,
				billingUrl: `${env.FRONTEND_URL}/settings/billing`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: event.data.email,
				subject: 'Action Required: Your QRcodly Payment is Past Due',
				html,
			});

			logger.info('subscription.pastDueEmailSent', {
				userId: event.data.userId,
				email: event.data.email,
			});
		} catch (error) {
			logger.error('subscription.pastDueEmailFailed', {
				userId: event.data.userId,
				email: event.data.email,
				error: error as Error,
			});
		}
	}
}
