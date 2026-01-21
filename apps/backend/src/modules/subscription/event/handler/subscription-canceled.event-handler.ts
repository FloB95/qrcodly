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
		const payer = event.data.payer;

		if (!payer) {
			logger.error('error:subscription.canceled.missingPayer', {
				subscription: {
					subscriptionId: event.data.id,
				},
			});
			return;
		}

		logger.info('subscription.canceled', {
			subscription: {
				userId: payer.id,
				periodEnd: event.data.period_end,
				canceled_at: event.data.canceled_at,
			},
		});

		try {
			// Create grace period for the user
			const gracePeriodEndDate = await createGracePeriodUseCase.execute({
				userId: payer.id,
				email: payer.email,
				firstName: payer.first_name,
			});

			// Send email notification
			const template = await mailer.getTemplate('subscription-canceled');
			const html = template({
				firstName: payer.first_name || 'there',
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
				to: payer.email,
				subject: 'Your QRcodly Subscription Has Ended',
				html,
			});

			logger.info('subscription.canceledEmailSent', {
				subscription: {
					userId: payer.id,
					email: payer.email,
					gracePeriodEndDate: gracePeriodEndDate.toISOString(),
				},
			});
		} catch (error) {
			logger.error('subscription.canceledEmailFailed', {
				subscription: {
					userId: payer.id,
					email: payer.email,
				},
				error: error as Error,
			});
		}
	}
}
