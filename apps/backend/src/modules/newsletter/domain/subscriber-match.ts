import { type IListmonkSubscriber, type TListmonkReplaceSubscriberInput } from '@/libs/listmonk';
import { type ISubscriberMatch } from './subscriber-match.interface';

/** Subscriber attribute that links a listmonk record to the Clerk account */
export const CLERK_USER_ID_ATTRIBUTE = 'clerk_user_id';

export const clerkUserIdOf = (subscriber: IListmonkSubscriber): string | null => {
	const id = subscriber.attribs?.[CLERK_USER_ID_ATTRIBUTE];
	return typeof id === 'string' && id !== '' ? id : null;
};

/** Whether campaigns to the list reach the subscriber (blocklisting is checked separately) */
export const isOnList = (subscriber: IListmonkSubscriber, listId: number): boolean =>
	subscriber.lists.some(
		(list) => list.id === listId && list.subscription_status !== 'unsubscribed',
	);

/** Sorts looked-up subscribers by how they belong to the account; `email` has to be lower case */
export const matchSubscribers = (
	subscribers: IListmonkSubscriber[],
	clerkUserId: string,
	email?: string | null,
): ISubscriberMatch => ({
	byClerkId: subscribers.find((subscriber) => clerkUserIdOf(subscriber) === clerkUserId) ?? null,
	byEmail: email
		? (subscribers.find((subscriber) => subscriber.email.toLowerCase() === email) ?? null)
		: null,
});

/**
 * A blocklisted record linked to the account blocks the person, also after an email change. One
 * that only holds the current address blocks that address.
 */
export const isBlocked = ({ byClerkId, byEmail }: ISubscriberMatch): boolean =>
	byClerkId?.status === 'blocklisted' || byEmail?.status === 'blocklisted';

/**
 * What a blocklist entry keeps once its account is gone: the address and the block itself (status
 * and listmonk's bounce records), nothing else about the person
 */
export const blockedAddressOnly = (
	subscriber: IListmonkSubscriber,
): TListmonkReplaceSubscriberInput => ({
	email: subscriber.email,
	name: subscriber.email,
	status: 'blocklisted',
	attribs: {},
});

/**
 * The account's address is held by a subscriber linked to another account, whose email change has
 * not reached listmonk yet. That record carries the other account's choice and is never taken over;
 * the reconciliation moves it to its own address.
 */
export const isLinkedToOtherAccount = ({ byClerkId, byEmail }: ISubscriberMatch): boolean =>
	!byClerkId && !!byEmail && clerkUserIdOf(byEmail) !== null;

/**
 * The linked subscriber that still gets mail at the old address, after the account moved onto an
 * address that is blocklisted on its own. null in every other case.
 */
export const leftOnOldAddress = (
	{ byClerkId, byEmail }: ISubscriberMatch,
	listId: number,
): IListmonkSubscriber | null => {
	if (!byClerkId || byClerkId.status === 'blocklisted') return null;
	if (byEmail?.status !== 'blocklisted') return null;
	return isOnList(byClerkId, listId) ? byClerkId : null;
};
