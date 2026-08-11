import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { DomainAddonReductionScheduledEvent } from '@/core/event/domain-addon-reduction-scheduled.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import { CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';
import { EnforceCustomDomainLimitUseCase } from '../../useCase/enforce-custom-domain-limit.use-case';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	weekday: 'long',
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	timeZone: 'UTC',
};

/**
 * Tells the user which domains a scheduled reduction will switch off, and when.
 *
 * The list is a projection, not a promise: the user keeps every slot they paid for until the
 * date, so domains added in the meantime lengthen it. Asking the real enforcement code for the
 * answer keeps the email and the eventual outcome ranked the same way.
 */
@EventHandler(DomainAddonReductionScheduledEvent.eventName)
export class DomainAddonReductionScheduledEventHandler extends AbstractEventHandler<DomainAddonReductionScheduledEvent> {
	constructor() {
		super();
	}

	async handle(event: DomainAddonReductionScheduledEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const entitlementService = container.resolve(CustomDomainEntitlementService);
		const enforceCustomDomainLimitUseCase = container.resolve(EnforceCustomDomainLimitUseCase);
		const { userId, email, firstName, quantity, scheduledQuantity, effectiveAt } = event.data;

		if (!userId) {
			logger.error('error:domainAddon.reductionScheduled.missingUserId', {
				subscription: { stripeSubscriptionId: event.data.stripeSubscriptionId },
			});
			return;
		}

		try {
			const { baseLimit } = await entitlementService.getCustomDomainLimit(userId);
			const { disabled } = await enforceCustomDomainLimitUseCase.execute(userId, {
				dryRun: true,
				overrideLimit: baseLimit + scheduledQuantity,
			});

			const template = await mailer.getTemplate('domain-addon-reduction-scheduled');
			const html = template({
				firstName: firstName || 'there',
				effectiveDate: effectiveAt.toLocaleDateString('en-US', DATE_FORMAT),
				currentQuantity: quantity,
				scheduledQuantity,
				isCurrentSingular: quantity === 1,
				isScheduledSingular: scheduledQuantity === 1,
				affectedDomains: disabled,
				hasAffectedDomains: disabled.length > 0,
				domainsUrl: `${env.FRONTEND_URL}/dashboard/settings/domains`,
				logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: email,
				subject: 'A Change To Your QRcodly Extra Domains Is Scheduled',
				html,
				template: 'domain-addon-reduction-scheduled',
			});

			logger.info('domainAddon.reductionScheduledEmailSent', {
				subscription: { userId, scheduledQuantity, affectedDomains: disabled },
			});
		} catch (error) {
			logger.error('domainAddon.reductionScheduledEmailFailed', {
				subscription: { userId, email },
				error: error as Error,
			});
		}
	}
}
