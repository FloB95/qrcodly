import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { DomainAddonCancelInitiatedEvent } from '@/core/event/domain-addon-cancel-initiated.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import { GRACE_PERIOD_DAYS } from '@/core/config/constants';
import { CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';
import UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';
import { EnforceCustomDomainLimitUseCase } from '../../useCase/enforce-custom-domain-limit.use-case';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	weekday: 'long',
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	timeZone: 'UTC',
};

@EventHandler(DomainAddonCancelInitiatedEvent.eventName)
export class DomainAddonCancelInitiatedEventHandler extends AbstractEventHandler<DomainAddonCancelInitiatedEvent> {
	constructor() {
		super();
	}

	async handle(event: DomainAddonCancelInitiatedEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const addonSubscriptionRepository = container.resolve(UserAddonSubscriptionRepository);
		const entitlementService = container.resolve(CustomDomainEntitlementService);
		const enforceCustomDomainLimitUseCase = container.resolve(EnforceCustomDomainLimitUseCase);
		const { userId, email, firstName, currentPeriodEnd } = event.data;

		if (!userId) {
			logger.error('error:domainAddon.cancelInitiated.missingUserId', {
				subscription: { stripeSubscriptionId: event.data.stripeSubscriptionId },
			});
			return;
		}

		try {
			const addon = await addonSubscriptionRepository.findByUserAndType(userId, 'custom_domain');
			if (addon?.cancellationNotifiedAt) {
				logger.info('domainAddon.cancelInitiated.alreadyNotified', { subscription: { userId } });
				return;
			}

			// The add-on is still active, so ask what would happen at the bare plan allowance. Using
			// the same ranking as the real enforcement guarantees the email names the same domains.
			const { baseLimit } = await entitlementService.getCustomDomainLimit(userId);
			const { disabled } = await enforceCustomDomainLimitUseCase.execute(userId, {
				dryRun: true,
				overrideLimit: baseLimit,
			});

			const gracePeriodEndDate = new Date(currentPeriodEnd);
			gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + GRACE_PERIOD_DAYS);

			const template = await mailer.getTemplate('domain-addon-cancel-initiated');
			const html = template({
				firstName: firstName || 'there',
				periodEndDate: currentPeriodEnd.toLocaleDateString('en-US', DATE_FORMAT),
				gracePeriodEndDate: gracePeriodEndDate.toLocaleDateString('en-US', DATE_FORMAT),
				affectedDomains: disabled,
				hasAffectedDomains: disabled.length > 0,
				domainsUrl: `${env.FRONTEND_URL}/dashboard/settings/domains`,
				logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: email,
				subject: 'Your QRcodly Extra Domains Are Ending',
				html,
				template: 'domain-addon-cancel-initiated',
			});

			if (addon) {
				await addonSubscriptionRepository.markCancellationNotified(addon);
			}

			logger.info('domainAddon.cancelInitiatedEmailSent', {
				subscription: { userId, affectedDomains: disabled },
			});
		} catch (error) {
			logger.error('domainAddon.cancelInitiatedEmailFailed', {
				subscription: { userId, email },
				error: error as Error,
			});
		}
	}
}
