import { inject, injectable } from 'tsyringe';
import { type TNewsletterSubscriptionResponseDto } from '@shared/schemas';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import { ListmonkClient } from '@/libs/listmonk';
import { SETTINGS_REQUEST } from '../config/constants';
import { storedLocale } from '../domain/newsletter-locale';
import { isEligible } from '../domain/newsletter-user';
import { isBlocked, isLinkedToOtherAccount, isOnList } from '../domain/subscriber-match';
import { NewsletterSyncService } from '../service/newsletter-sync.service';

/** Reads the status live from listmonk; fails soft so the settings page still renders */
@injectable()
export class GetNewsletterSubscriptionUseCase implements IBaseUseCase {
	constructor(
		@inject(ListmonkClient) private readonly listmonk: ListmonkClient,
		@inject(NewsletterSyncService) private readonly sync: NewsletterSyncService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(userId: string): Promise<TNewsletterSubscriptionResponseDto> {
		if (!this.listmonk.isEnabled()) return { status: 'disabled', locale: null };

		try {
			const user = await this.sync.getUser(userId);
			const match = await this.sync.findMatch(userId, user.email, SETTINGS_REQUEST);
			const subscriber = match.byClerkId ?? match.byEmail;

			// the sync adds every eligible account with the sign-up language; PUT could not save a
			// choice for the others
			if (!subscriber) {
				return isEligible(user)
					? { status: 'subscribed', locale: user.locale }
					: { status: 'unavailable', locale: null };
			}

			if (isBlocked(match)) return { status: 'blocked', locale: null };
			// that record holds another account's choice; PUT refuses to change it
			if (isLinkedToOtherAccount(match)) return { status: 'unavailable', locale: null };
			return {
				status: isOnList(subscriber, this.listmonk.getListId()) ? 'subscribed' : 'unsubscribed',
				locale: storedLocale(subscriber.attribs),
			};
		} catch (error) {
			this.logger.error('newsletter.subscription.status-failed', { error, userId });
			return { status: 'unavailable', locale: null };
		}
	}
}
