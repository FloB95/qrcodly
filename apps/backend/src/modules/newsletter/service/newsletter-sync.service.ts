import { inject, singleton } from 'tsyringe';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import {
	ListmonkApiError,
	ListmonkClient,
	type IListmonkRequestOptions,
	type IListmonkSubscriber,
} from '@/libs/listmonk';
import { fromClerkUser, isEligible, newSubscriberInput } from '../domain/newsletter-user';
import { type INewsletterUser } from '../domain/newsletter-user.interface';
import {
	type INewsletterSyncApplyOptions,
	type TNewsletterRemoveOutcome,
	type TNewsletterSource,
	type TNewsletterSyncOutcome,
	type TNewsletterUnsubscribeOutcome,
} from '../domain/newsletter-sync.interface';
import {
	blockedAddressOnly,
	CLERK_USER_ID_ATTRIBUTE,
	isBlocked,
	isOnList,
	isLinkedToOtherAccount,
	leftOnOldAddress,
	matchSubscribers,
} from '../domain/subscriber-match';
import { type ISubscriberMatch } from '../domain/subscriber-match.interface';

/**
 * Keeps one account's listmonk subscriber in line with its Clerk user. Shared by the webhook
 * handlers, the reconciliation and the settings toggle. Never puts anyone back on the list:
 * memberships are only written when a subscriber is created or ended when the account moves onto
 * a blocked address or is banned, everything else changes email or attribs only. The language is
 * only written when a subscriber is created.
 */
@singleton()
export class NewsletterSyncService {
	constructor(
		@inject(ListmonkClient) private readonly listmonk: ListmonkClient,
		@inject(ClerkUserInfoService) private readonly clerkUsers: ClerkUserInfoService,
	) {}

	isEnabled(): boolean {
		return this.listmonk.isEnabled();
	}

	/** Throws when Clerk fails; a deleted account is an error with `status` 404 */
	async getUser(userId: string): Promise<INewsletterUser> {
		return fromClerkUser(await this.clerkUsers.getUser(userId));
	}

	/** The subscribers linked to the account or holding its address; `email` has to be lower case */
	async findMatch(
		userId: string,
		email?: string | null,
		options?: IListmonkRequestOptions,
	): Promise<ISubscriberMatch> {
		const subscribers = await this.listmonk.findSubscribers(
			{ attribute: { key: CLERK_USER_ID_ATTRIBUTE, value: userId }, email },
			options,
		);
		return matchSubscribers(subscribers, userId, email);
	}

	/** Sign-up: create the subscriber on the list, or link an existing one by email */
	async ensureSubscriber(
		user: INewsletterUser,
		source: TNewsletterSource,
	): Promise<TNewsletterSyncOutcome> {
		if (!isEligible(user)) return 'skipped';
		return this.apply(user, await this.findMatch(user.id, user.email), { source, create: true });
	}

	/** Follows a changed primary email; never creates a subscriber */
	async syncEmail(user: INewsletterUser): Promise<TNewsletterSyncOutcome> {
		if (!isEligible(user)) return 'skipped';
		return this.apply(user, await this.findMatch(user.id, user.email), {
			source: 'sync',
			create: false,
		});
	}

	async removeUser(userId: string): Promise<TNewsletterRemoveOutcome> {
		const { byClerkId } = await this.findMatch(userId);
		if (!byClerkId) return 'missing';
		// a blocklist entry has to outlive the account, or a new sign-up with the address mails again;
		// only the address and the block stay
		if (byClerkId.status === 'blocklisted') {
			await this.listmonk.replaceSubscriber(byClerkId.id, blockedAddressOnly(byClerkId));
			return 'blocked';
		}
		await this.listmonk.deleteSubscriber(byClerkId.id);
		return 'deleted';
	}

	/** A banned account: its subscriber leaves the list and is never put back automatically */
	async unsubscribeUser(userId: string): Promise<TNewsletterUnsubscribeOutcome> {
		const { byClerkId } = await this.findMatch(userId);
		return this.unsubscribe(byClerkId);
	}

	/** Blocklisted subscribers are never changed */
	async unsubscribe(
		subscriber: IListmonkSubscriber | null,
		dryRun = false,
	): Promise<TNewsletterUnsubscribeOutcome> {
		if (!subscriber) return 'missing';
		if (subscriber.status === 'blocklisted') return 'blocked';
		if (!isOnList(subscriber, this.listmonk.getListId())) return 'unchanged';
		if (!dryRun) await this.listmonk.unsubscribeFromList(subscriber.id);
		return 'unsubscribed';
	}

	/**
	 * The account moved onto an address that is blocklisted on its own: stop mailing the address it
	 * left. Blocklisted subscribers are never changed.
	 */
	async stopMailingOldAddress(
		match: ISubscriberMatch,
		options?: IListmonkRequestOptions,
	): Promise<void> {
		const subscriber = leftOnOldAddress(match, this.listmonk.getListId());
		if (subscriber) await this.listmonk.unsubscribeFromList(subscriber.id, options);
	}

	async apply(
		user: INewsletterUser,
		match: ISubscriberMatch,
		{ source, create, dryRun = false }: INewsletterSyncApplyOptions,
	): Promise<TNewsletterSyncOutcome> {
		if (!isEligible(user)) return 'skipped';

		if (isBlocked(match)) {
			if (!dryRun) await this.stopMailingOldAddress(match);
			return 'blocked';
		}

		const { byClerkId, byEmail } = match;

		if (byClerkId) {
			if (byClerkId.email.toLowerCase() === user.email) return 'unchanged';
			// another subscriber already holds the new address
			if (byEmail) return 'conflict';
			if (!dryRun) await this.listmonk.updateSubscriber(byClerkId.id, { email: user.email });
			return 'email_updated';
		}

		if (byEmail) {
			if (isLinkedToOtherAccount(match)) return 'conflict';
			if (!dryRun) {
				await this.listmonk.updateSubscriber(byEmail.id, {
					attribs: { ...byEmail.attribs, [CLERK_USER_ID_ATTRIBUTE]: user.id },
				});
			}
			return 'linked';
		}

		if (!create) return 'missing';
		if (dryRun) return 'created';

		try {
			await this.listmonk.createSubscriber(
				newSubscriberInput(user, source, [this.listmonk.getListId()]),
			);
		} catch (error) {
			// created in parallel (webhook vs. reconciliation); the next run links it
			if (error instanceof ListmonkApiError && error.status === 409) return 'conflict';
			throw error;
		}
		return 'created';
	}
}
