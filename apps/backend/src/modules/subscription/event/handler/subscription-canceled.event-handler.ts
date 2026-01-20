import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { SubscriptionCanceledEvent } from '@/core/event/subscription-canceled.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import { CreateGracePeriodUseCase } from '../../useCase/create-grace-period.use-case';

@EventHandler(SubscriptionCanceledEvent.eventName)
export class SubscriptionCanceledEventHandler extends AbstractEventHandler<SubscriptionCanceledEvent> {
	constructor() {
		super();
	}

	async handle(event: SubscriptionCanceledEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const createGracePeriodUseCase = container.resolve(CreateGracePeriodUseCase);

		logger.info('subscription.canceled', {
			userId: event.data.userId,
		});

		try {
			// Create grace period for the user
			const gracePeriodEndDate = await createGracePeriodUseCase.execute({
				userId: event.data.userId,
				email: event.data.email,
				firstName: event.data.firstName,
			});

			// Send email notification
			const template = await mailer.getTemplate('subscription-canceled');
			const html = template({
				firstName: event.data.firstName,
				gracePeriodEndDate: gracePeriodEndDate.toLocaleDateString('en-US', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					timeZone: 'UTC',
				}),
				subscribeUrl: `${env.FRONTEND_URL}/pricing`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: event.data.email,
				subject: 'Your QRcodly Subscription Has Ended',
				html,
			});

			logger.info('subscription.canceledEmailSent', {
				userId: event.data.userId,
				email: event.data.email,
				gracePeriodEndDate: gracePeriodEndDate.toISOString(),
			});
		} catch (error) {
			logger.error('subscription.canceledEmailFailed', {
				userId: event.data.userId,
				email: event.data.email,
				error: error as Error,
			});
		}
	}
}
