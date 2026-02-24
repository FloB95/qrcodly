import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { SubscriptionActiveEvent } from '@/core/event/subscription-active.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import { EnableUserDomainsUseCase } from '../../useCase/enable-user-domains.use-case';
import UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';

@EventHandler(SubscriptionActiveEvent.eventName)
export class SubscriptionActiveEventHandler extends AbstractEventHandler<SubscriptionActiveEvent> {
	constructor() {
		super();
	}

	async handle(event: SubscriptionActiveEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const enableUserDomainsUseCase = container.resolve(EnableUserDomainsUseCase);
		const userSubscriptionRepository = container.resolve(UserSubscriptionRepository);
		const { userId, email, firstName } = event.data;

		if (!userId) {
			logger.error('error:subscription.active.missingUserId', {
				subscription: {
					stripeSubscriptionId: event.data.stripeSubscriptionId,
				},
			});
			return;
		}

		logger.info('subscription.active', {
			subscription: {
				userId,
				currentPeriodEnd: event.data.currentPeriodEnd,
			},
		});

		try {
			// Check if user had a grace period (was in cancellation flow)
			const subscription = await userSubscriptionRepository.findByUserId(userId);
			const wasInGracePeriod = subscription?.gracePeriodEndsAt != null;

			// Enable domains and clear grace period
			await enableUserDomainsUseCase.execute(userId);

			// Only send reactivation email if user was in grace period
			if (wasInGracePeriod) {
				const template = await mailer.getTemplate('subscription-reactivated');
				const html = template({
					firstName: firstName || 'there',
					dashboardUrl: `${env.FRONTEND_URL}/dashboard/qr-codes`,
					year: new Date().getFullYear(),
				});

				await mailer.sendMail({
					to: email,
					subject: 'Welcome Back! Your QRcodly Subscription is Active',
					html,
				});

				logger.info('subscription.reactivatedEmailSent', {
					subscription: { userId },
				});
			}
		} catch (error) {
			logger.error('subscription.activeHandlerFailed', {
				subscription: { userId, email },
				error: error as Error,
			});
		}
	}
}
