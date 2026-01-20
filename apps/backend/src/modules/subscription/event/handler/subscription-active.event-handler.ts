import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { SubscriptionActiveEvent } from '@/core/event/subscription-active.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import { EnableUserDomainsUseCase } from '../../useCase/enable-user-domains.use-case';
import SubscriptionGracePeriodRepository from '../../domain/repository/subscription-grace-period.repository';

@EventHandler(SubscriptionActiveEvent.eventName)
export class SubscriptionActiveEventHandler extends AbstractEventHandler<SubscriptionActiveEvent> {
	constructor() {
		super();
	}

	async handle(event: SubscriptionActiveEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const enableUserDomainsUseCase = container.resolve(EnableUserDomainsUseCase);
		const gracePeriodRepository = container.resolve(SubscriptionGracePeriodRepository);

		logger.info('subscription.active', {
			userId: event.data.userId,
			email: event.data.email,
		});

		try {
			// Check if user had a grace period or disabled domains
			const existingGracePeriod = await gracePeriodRepository.findByUserId(event.data.userId);

			// Enable domains and remove grace period
			await enableUserDomainsUseCase.execute(event.data.userId);

			// Only send reactivation email if user was in grace period or had domains disabled
			if (existingGracePeriod) {
				const template = await mailer.getTemplate('subscription-reactivated');
				const html = template({
					firstName: event.data.firstName,
					dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
					year: new Date().getFullYear(),
				});

				await mailer.sendMail({
					to: event.data.email,
					subject: 'Welcome Back! Your QRcodly Subscription is Active',
					html,
				});

				logger.info('subscription.reactivatedEmailSent', {
					userId: event.data.userId,
					email: event.data.email,
				});
			}
		} catch (error) {
			logger.error('subscription.activeHandlerFailed', {
				userId: event.data.userId,
				email: event.data.email,
				error: error as Error,
			});
		}
	}
}
