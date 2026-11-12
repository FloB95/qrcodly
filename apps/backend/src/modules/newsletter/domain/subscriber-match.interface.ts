import { type IListmonkSubscriber } from '@/libs/listmonk';

/** The listmonk subscribers that belong to one account */
export interface ISubscriberMatch {
	/** Linked to the account through the Clerk user id attribute */
	byClerkId: IListmonkSubscriber | null;
	/** Holds the account's current address; the same record as `byClerkId` unless the email changed */
	byEmail: IListmonkSubscriber | null;
}
