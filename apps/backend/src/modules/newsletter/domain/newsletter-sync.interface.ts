import { type IListmonkSubscriber } from '@/libs/listmonk';

/** Where a subscriber was created; stored in the subscriber attributes */
export type TNewsletterSource = 'signup' | 'sync' | 'settings';

export type TNewsletterSyncOutcome =
	| 'created'
	| 'linked'
	| 'email_updated'
	| 'unchanged'
	| 'missing'
	| 'blocked'
	| 'conflict'
	| 'skipped';

export type TNewsletterRemoveOutcome = 'deleted' | 'missing' | 'blocked';

/** 'unchanged': the subscriber was not on the list anymore */
export type TNewsletterUnsubscribeOutcome = 'unsubscribed' | 'unchanged' | 'missing' | 'blocked';

/** Why a reconciliation run stopped before changing anything */
export type TNewsletterSyncAbortReason =
	'clerk_list_failed' | 'no_clerk_users' | 'too_many_deletions';

export interface INewsletterSyncApplyOptions {
	source: TNewsletterSource;
	/** false: only touch subscribers that already exist */
	create: boolean;
	/** Only report what would happen */
	dryRun?: boolean;
}

export interface INewsletterReconciliationOptions {
	/** Only count, change nothing in listmonk */
	dryRun: boolean;
	/** Lifts the deletion limit; only for a CLI run after checking the numbers */
	allowMassDelete?: boolean;
}

/** A subscriber linked to an account that the Clerk listing does not contain */
export interface INewsletterOrphan {
	subscriber: IListmonkSubscriber;
	clerkUserId: string;
}

export type TNewsletterReconciliationSummary = Record<
	| TNewsletterSyncOutcome
	| 'errors'
	| 'deleted'
	/** Blocklist entries of deleted accounts reduced to the address */
	| 'anonymized'
	| 'kept'
	/** Banned accounts taken off the list */
	| 'banned_unsubscribed'
	/** Accounts on the list after the run, by the language they get */
	| 'recipients_de'
	| 'recipients_en',
	number
> & {
	clerkUsers: number;
	subscribers: number;
};
