export type TListmonkSubscriberStatus = 'enabled' | 'disabled' | 'blocklisted';

export type TListmonkSubscriptionStatus = 'unconfirmed' | 'confirmed' | 'unsubscribed';

export interface IListmonkListMembership {
	id: number;
	subscription_status: TListmonkSubscriptionStatus;
}

export interface IListmonkSubscriber {
	id: number;
	email: string;
	name: string;
	status: TListmonkSubscriberStatus;
	attribs: Record<string, unknown>;
	lists: IListmonkListMembership[];
}

export interface IListmonkCreateSubscriberInput {
	email: string;
	name: string;
	attribs: Record<string, unknown>;
	/** Lists the subscriber joins as confirmed, without an opt-in mail */
	listIds: number[];
}

/** The envelope listmonk wraps every answer in */
export interface IListmonkResponse<T> {
	data: T;
}

/** One page of GET /api/subscribers */
export interface IListmonkSubscriberPage {
	results: IListmonkSubscriber[];
	/** Subscribers matching the query over all pages */
	total: number;
}

/**
 * listmonk merges the sent top-level keys into the stored `attribs`, and a key cannot be removed
 * this way. Send the complete object so the result does not depend on that.
 */
export type TListmonkUpdateSubscriberInput = Partial<
	Pick<IListmonkSubscriber, 'email' | 'name' | 'attribs'>
>;

/** A full replacement: `attribs` is stored exactly as sent and every list membership is dropped */
export type TListmonkReplaceSubscriberInput = Pick<
	IListmonkSubscriber,
	'email' | 'name' | 'status' | 'attribs'
>;

export interface IListmonkAttributeCriterion {
	/** Top-level key in `attribs`; lower case letters, digits and underscores only */
	key: string;
	value: string;
}

/** A subscriber matches when at least one of the given criteria does */
export interface IListmonkSubscriberLookup {
	/** Compared case-insensitively */
	email?: string | null;
	attribute?: IListmonkAttributeCriterion;
}

export interface IListmonkRequestOptions {
	/** A user is waiting for the answer: short timeout, no retries */
	interactive?: boolean;
}

/** One call to the listmonk API as the client sends it */
export interface IListmonkRequest extends IListmonkRequestOptions {
	/** Fixed name for metrics and errors; never contains ids or user input */
	operation: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	path: string;
	query?: Record<string, string>;
	body?: unknown;
	/** Only calls that can safely run twice are retried */
	idempotent: boolean;
}
