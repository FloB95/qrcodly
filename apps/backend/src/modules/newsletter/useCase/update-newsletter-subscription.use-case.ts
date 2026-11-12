import { inject, injectable } from 'tsyringe';
import {
	type TNewsletterContentLocale,
	type TNewsletterSubscriptionResponseDto,
	type TUpdateNewsletterSubscriptionDto,
} from '@shared/schemas';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import {
	BadRequestError,
	ConflictError,
	CustomApiError,
	ServiceUnavailableError,
} from '@/core/error/http';
import { Logger } from '@/core/logging';
import {
	ListmonkApiError,
	ListmonkClient,
	type IListmonkSubscriber,
	type TListmonkUpdateSubscriberInput,
} from '@/libs/listmonk';
import { SETTINGS_REQUEST } from '../config/constants';
import {
	LOCALE_ATTRIBUTE,
	LOCALE_SOURCE_ATTRIBUTE,
	localeAttribs,
	storedLocale,
} from '../domain/newsletter-locale';
import { newSubscriberInput, subscriberName } from '../domain/newsletter-user';
import {
	type INewsletterUser,
	type TEligibleNewsletterUser,
} from '../domain/newsletter-user.interface';
import {
	CLERK_USER_ID_ATTRIBUTE,
	isBlocked,
	isLinkedToOtherAccount,
	isOnList,
} from '../domain/subscriber-match';
import { NewsletterSyncService } from '../service/newsletter-sync.service';

/**
 * The settings toggle: the only place that may put an existing subscriber back on the list, and
 * only when `subscribed` is sent. A language sent along is the user's choice; without one the
 * stored language is kept. Blocklisted subscribers stay untouched.
 */
@injectable()
export class UpdateNewsletterSubscriptionUseCase implements IBaseUseCase {
	constructor(
		@inject(ListmonkClient) private readonly listmonk: ListmonkClient,
		@inject(NewsletterSyncService) private readonly sync: NewsletterSyncService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(
		userId: string,
		dto: TUpdateNewsletterSubscriptionDto,
	): Promise<TNewsletterSubscriptionResponseDto> {
		if (!this.listmonk.isEnabled()) throw new ServiceUnavailableError('Newsletter is unavailable');

		try {
			return await this.update(userId, dto);
		} catch (error) {
			if (error instanceof CustomApiError) throw error;
			this.logger.error('newsletter.subscription.update-failed', { error, userId });
			throw new ServiceUnavailableError('Newsletter is unavailable');
		}
	}

	private async update(
		userId: string,
		{ subscribed, locale }: TUpdateNewsletterSubscriptionDto,
	): Promise<TNewsletterSubscriptionResponseDto> {
		const user = await this.sync.getUser(userId);
		let match = await this.sync.findMatch(userId, user.email, SETTINGS_REQUEST);
		let subscriber = match.byClerkId ?? match.byEmail;

		if (!subscriber) {
			// nothing to store the choice under; the UI must not show it as saved
			if (!user.email) throw new BadRequestError('The account has no verified email address');
			try {
				// opt-out: an account without a subscriber counts as subscribed
				return await this.create({ ...user, email: user.email }, subscribed ?? true, locale);
			} catch (error) {
				// created in the meantime (sign-up webhook): continue with that record
				if (!(error instanceof ListmonkApiError && error.status === 409)) throw error;
				match = await this.sync.findMatch(userId, user.email, SETTINGS_REQUEST);
				subscriber = match.byClerkId ?? match.byEmail;
				if (!subscriber) throw error;
			}
		}

		if (isBlocked(match)) {
			await this.sync.stopMailingOldAddress(match, SETTINGS_REQUEST);
			return { status: 'blocked', locale: null };
		}

		// taking the record over would overwrite the other account's choice
		if (isLinkedToOtherAccount(match)) {
			this.logger.warn('newsletter.subscription.linked-to-other-account', { userId });
			throw new ConflictError('The email address is still linked to another account');
		}

		// the account moved to an address that another subscriber already holds
		const emailConflict = !!match.byEmail && match.byEmail.id !== subscriber.id;
		if (emailConflict) this.logger.warn('newsletter.subscription.email-conflict', { userId });

		const changes = this.profileChanges(subscriber, user, locale, !emailConflict);
		if (changes) await this.listmonk.updateSubscriber(subscriber.id, changes, SETTINGS_REQUEST);
		const resultLocale = storedLocale(changes?.attribs ?? subscriber.attribs);
		const listId = this.listmonk.getListId();

		if (subscribed === undefined) {
			return {
				status: isOnList(subscriber, listId) ? 'subscribed' : 'unsubscribed',
				locale: resultLocale,
			};
		}

		if (subscribed) {
			await this.listmonk.addToList(subscriber.id, 'confirmed', SETTINGS_REQUEST);
			return { status: 'subscribed', locale: resultLocale };
		}

		const membership = subscriber.lists.find((list) => list.id === listId);
		if (!membership) {
			await this.listmonk.addToList(subscriber.id, 'unsubscribed', SETTINGS_REQUEST);
		} else if (membership.subscription_status !== 'unsubscribed') {
			await this.listmonk.unsubscribeFromList(subscriber.id, SETTINGS_REQUEST);
		}
		return { status: 'unsubscribed', locale: resultLocale };
	}

	private async create(
		user: TEligibleNewsletterUser,
		subscribed: boolean,
		locale: TNewsletterContentLocale | undefined,
	): Promise<TNewsletterSubscriptionResponseDto> {
		const created = await this.listmonk.createSubscriber(
			newSubscriberInput(user, 'settings', subscribed ? [this.listmonk.getListId()] : [], locale),
			SETTINGS_REQUEST,
		);
		const resultLocale = locale ?? user.locale;
		if (subscribed) return { status: 'subscribed', locale: resultLocale };

		// an opt-out is kept as a membership: listmonk maintenance deletes subscribers without any
		// list, and the sync would then add the account again
		await this.listmonk.addToList(created.id, 'unsubscribed', SETTINGS_REQUEST);
		return { status: 'unsubscribed', locale: resultLocale };
	}

	private profileChanges(
		subscriber: IListmonkSubscriber,
		user: INewsletterUser,
		locale: TNewsletterContentLocale | undefined,
		followEmail: boolean,
	): TListmonkUpdateSubscriberInput | null {
		const changes: TListmonkUpdateSubscriberInput = {};

		if (followEmail && user.email && subscriber.email.toLowerCase() !== user.email) {
			changes.email = user.email;
		}

		const name = subscriberName(user);
		if (name && subscriber.name !== name) changes.name = name;

		const attribs: Record<string, unknown> = {
			...subscriber.attribs,
			[CLERK_USER_ID_ATTRIBUTE]: user.id,
			...(locale ? localeAttribs(locale, 'user') : {}),
		};
		const attribsChanged = [
			CLERK_USER_ID_ATTRIBUTE,
			LOCALE_ATTRIBUTE,
			LOCALE_SOURCE_ATTRIBUTE,
		].some((key) => attribs[key] !== subscriber.attribs?.[key]);
		if (attribsChanged) changes.attribs = attribs;

		return Object.keys(changes).length > 0 ? changes : null;
	}
}
