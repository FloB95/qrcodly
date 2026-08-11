import { EventHandler } from '@/core/decorators/event-handler.decorator';
import { DomainAddonQuantityReducedEvent } from '@/core/event/domain-addon-quantity-reduced.event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { Mailer } from '@/core/mailer/mailer';
import { env } from '@/core/config/env';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';

/**
 * Confirms a scheduled reduction once it has actually taken effect.
 *
 * The domains are already switched off by the time this runs, so the list is read from their
 * current state rather than projected — this is a report, not a warning.
 */
@EventHandler(DomainAddonQuantityReducedEvent.eventName)
export class DomainAddonQuantityReducedEventHandler extends AbstractEventHandler<DomainAddonQuantityReducedEvent> {
	constructor() {
		super();
	}

	async handle(event: DomainAddonQuantityReducedEvent): Promise<void> {
		const logger = container.resolve(Logger);
		const mailer = container.resolve(Mailer);
		const customDomainRepository = container.resolve(CustomDomainRepository);
		const { userId, email, firstName, quantity } = event.data;

		if (!userId) {
			logger.error('error:domainAddon.quantityReduced.missingUserId', {
				subscription: { stripeSubscriptionId: event.data.stripeSubscriptionId },
			});
			return;
		}

		try {
			const domains = await customDomainRepository.findAllByUserId(userId);
			const disabled = domains.filter((domain) => !domain.isEnabled).map((d) => d.domain);

			const template = await mailer.getTemplate('domain-addon-quantity-reduced');
			const html = template({
				firstName: firstName || 'there',
				quantity,
				isSingular: quantity === 1,
				affectedDomains: disabled,
				hasAffectedDomains: disabled.length > 0,
				domainsUrl: `${env.FRONTEND_URL}/dashboard/settings/domains`,
				logoUrl: `${env.FRONTEND_URL}/email-logo.png`,
				year: new Date().getFullYear(),
			});

			await mailer.sendMail({
				to: email,
				subject: 'Your QRcodly Extra Domains Have Been Updated',
				html,
				template: 'domain-addon-quantity-reduced',
			});

			logger.info('domainAddon.quantityReducedEmailSent', {
				subscription: { userId, quantity, affectedDomains: disabled },
			});
		} catch (error) {
			logger.error('domainAddon.quantityReducedEmailFailed', {
				subscription: { userId, email },
				error: error as Error,
			});
		}
	}
}
