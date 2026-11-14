import { singleton } from 'tsyringe';
import { env } from '@/core/config/env';
import { withRetry } from '@/core/utils/with-retry';
import { trackExternal } from '@/core/metrics';
import { ListmonkApiError } from './listmonk.error';
import {
	type IListmonkCreateSubscriberInput,
	type IListmonkRequest,
	type IListmonkRequestOptions,
	type IListmonkResponse,
	type IListmonkSubscriber,
	type IListmonkSubscriberLookup,
	type IListmonkSubscriberPage,
	type TListmonkReplaceSubscriberInput,
	type TListmonkSubscriptionStatus,
	type TListmonkUpdateSubscriberInput,
} from './listmonk.interface';

/*
 * listmonk v6.2.0 behaviour this client relies on, checked against the v6.2.0 sources:
 * - Auth header `token <api_user>:<token>` (internal/auth/auth.go, parseAuthHeader).
 * - GET /api/subscribers `query` is a raw SQL WHERE fragment and needs subscribers:sql_query on top
 *   of subscribers:get_all. It is appended as `AND %query%` behind listmonk's own list and search
 *   conditions, so an OR expression has to be parenthesized. Values are inlined, so they are quoted
 *   with '' escaping here. Results include blocklisted subscribers and `lists[]` with each
 *   `subscription_status`; `order=asc` pages by id. per_page is not capped (AllowAll), and the
 *   answer carries the `total` over all pages (cmd/subscribers.go QuerySubscribers, cmd/main.go,
 *   internal/core/subscribers.go, queries/subscribers.sql query-subscribers).
 * - POST /api/subscribers: name optional, email lowercased, status defaults to enabled,
 *   `preconfirm_subscriptions` confirms the memberships without an opt-in mail, an existing email
 *   answers 409 (InsertSubscriber, internal/subimporter/importer.go ValidateFields).
 * - PUT /api/subscribers/:id deletes every membership missing from `lists`
 *   (update-subscriber-with-lists), so it is never used. PATCH starts from the stored record: it
 *   leaves memberships alone when `lists` is omitted and merges the sent top-level `attribs` keys
 *   into the stored ones, so a key cannot be removed (cmd/subscribers.go PatchSubscriber).
 * - PUT /api/subscribers/lists: `add` upserts the membership with the given status, `unsubscribe`
 *   only flips existing memberships (add-subscribers-to-lists, unsubscribe-subscribers-from-lists).
 * - Campaigns to a single opt-in list go to every membership that is not `unsubscribed`, so
 *   `unconfirmed` gets mail too (next-campaign-subscribers).
 * - DELETE /api/subscribers/:id removes the row; memberships cascade (schema.sql). Subscriber
 *   maintenance deletes subscribers without any list (delete-orphan-subscribers).
 * - Database errors answer 500 (e.g. a unique email on PATCH), so a plain 500 is not retried.
 * - A subscriber without any list is only reachable with lists:get_all (cmd/subscribers.go
 *   hasSubPerm, internal/auth/models.go).
 */

const LIST_PAGE_SIZE = 1000;
const LOOKUP_PAGE_SIZE = 10;
const TIMEOUT_MS = 5000;
const INTERACTIVE_TIMEOUT_MS = 3000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = [429, 502, 503, 504];
// the key ends up inside the SQL fragment, so nothing but a plain identifier is let through
const ATTRIBUTE_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const isRetryable = (error: unknown): boolean => {
	if (error instanceof ListmonkApiError) return RETRYABLE_STATUSES.includes(error.status);
	// network failures surface as TypeError, AbortSignal.timeout as TimeoutError
	const name = (error as { name?: unknown } | null)?.name;
	return name === 'TypeError' || name === 'AbortError' || name === 'TimeoutError';
};

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

const lookupConditions = ({ email, attribute }: IListmonkSubscriberLookup): string[] => {
	const conditions: string[] = [];
	if (attribute) {
		if (!ATTRIBUTE_KEY_PATTERN.test(attribute.key)) {
			throw new Error('Invalid listmonk attribute key');
		}
		conditions.push(
			`subscribers.attribs->>${sqlString(attribute.key)} = ${sqlString(attribute.value)}`,
		);
	}
	if (email) conditions.push(`LOWER(subscribers.email) = LOWER(${sqlString(email)})`);
	return conditions;
};

/** HTTP client for the subscriber API of a self-hosted listmonk and the one list this app mails */
@singleton()
export class ListmonkClient {
	isEnabled(): boolean {
		return (
			!!env.LISTMONK_URL &&
			!!env.LISTMONK_API_USER &&
			!!env.LISTMONK_API_TOKEN &&
			!!env.LISTMONK_LIST_ID
		);
	}

	getListId(): number {
		if (!this.isEnabled()) throw new Error('listmonk is not configured');
		return env.LISTMONK_LIST_ID!;
	}

	/** Blocklisted subscribers included */
	async findSubscribers(
		lookup: IListmonkSubscriberLookup,
		options?: IListmonkRequestOptions,
	): Promise<IListmonkSubscriber[]> {
		const conditions = lookupConditions(lookup);
		// an empty WHERE fragment would match every subscriber
		if (conditions.length === 0) return [];

		const page = await this.request<IListmonkSubscriberPage>({
			operation: 'subscribers.query',
			method: 'GET',
			path: '/api/subscribers',
			query: { query: `(${conditions.join(' OR ')})`, per_page: String(LOOKUP_PAGE_SIZE) },
			idempotent: true,
			...options,
		});
		return page.results ?? [];
	}

	/** Every subscriber, blocklisted ones included */
	async listAllSubscribers(): Promise<IListmonkSubscriber[]> {
		const subscribers: IListmonkSubscriber[] = [];
		for (let page = 1; ; page++) {
			const { results, total } = await this.request<IListmonkSubscriberPage>({
				operation: 'subscribers.list',
				method: 'GET',
				path: '/api/subscribers',
				query: { page: String(page), per_page: String(LIST_PAGE_SIZE), order: 'asc' },
				idempotent: true,
			});
			subscribers.push(...(results ?? []));
			// a short page is not the end when listmonk caps per_page, so the total decides
			if (!results?.length || subscribers.length >= total) return subscribers;
		}
	}

	/** An email that already exists is rejected with a ListmonkApiError of status 409 */
	async createSubscriber(
		input: IListmonkCreateSubscriberInput,
		options?: IListmonkRequestOptions,
	): Promise<IListmonkSubscriber> {
		return this.request<IListmonkSubscriber>({
			operation: 'subscribers.create',
			method: 'POST',
			path: '/api/subscribers',
			body: {
				email: input.email,
				name: input.name,
				status: 'enabled',
				attribs: input.attribs,
				lists: input.listIds,
				preconfirm_subscriptions: true,
			},
			idempotent: false,
			...options,
		});
	}

	/** PATCH, so the list memberships stay as they are */
	async updateSubscriber(
		id: number,
		update: TListmonkUpdateSubscriberInput,
		options?: IListmonkRequestOptions,
	): Promise<void> {
		await this.request({
			operation: 'subscribers.patch',
			method: 'PATCH',
			path: `/api/subscribers/${id}`,
			// without lists nothing is added; preconfirm only keeps listmonk from sending an opt-in mail
			body: { ...update, preconfirm_subscriptions: true },
			idempotent: true,
			...options,
		});
	}

	/** Creates or overwrites the membership in the configured list */
	async addToList(
		id: number,
		status: TListmonkSubscriptionStatus,
		options?: IListmonkRequestOptions,
	): Promise<void> {
		await this.request({
			operation: 'subscribers.lists.add',
			method: 'PUT',
			path: '/api/subscribers/lists',
			body: { ids: [id], action: 'add', target_list_ids: [this.getListId()], status },
			idempotent: true,
			...options,
		});
	}

	/** Only flips an existing membership in the configured list */
	async unsubscribeFromList(id: number, options?: IListmonkRequestOptions): Promise<void> {
		await this.request({
			operation: 'subscribers.lists.unsubscribe',
			method: 'PUT',
			path: '/api/subscribers/lists',
			body: { ids: [id], action: 'unsubscribe', target_list_ids: [this.getListId()] },
			idempotent: true,
			...options,
		});
	}

	/** PUT: the only way to remove `attribs` keys; it also drops every list membership */
	async replaceSubscriber(id: number, input: TListmonkReplaceSubscriberInput): Promise<void> {
		await this.request({
			operation: 'subscribers.replace',
			method: 'PUT',
			path: `/api/subscribers/${id}`,
			body: { ...input, lists: [], preconfirm_subscriptions: true },
			idempotent: true,
		});
	}

	async deleteSubscriber(id: number): Promise<void> {
		await this.request({
			operation: 'subscribers.delete',
			method: 'DELETE',
			path: `/api/subscribers/${id}`,
			idempotent: true,
		});
	}

	private async request<T>({
		operation,
		method,
		path,
		query,
		body,
		idempotent,
		interactive = false,
	}: IListmonkRequest): Promise<T> {
		if (!this.isEnabled()) throw new Error('listmonk is not configured');

		const baseUrl = env.LISTMONK_URL!.replace(/\/+$/, '');
		const url = `${baseUrl}${path}${query ? `?${new URLSearchParams(query).toString()}` : ''}`;
		const headers: Record<string, string> = {
			Authorization: `token ${env.LISTMONK_API_USER}:${env.LISTMONK_API_TOKEN}`,
		};
		if (body !== undefined) headers['Content-Type'] = 'application/json';

		const send = () =>
			trackExternal('listmonk', operation, async () => {
				const response = await fetch(url, {
					method,
					headers,
					body: body === undefined ? undefined : JSON.stringify(body),
					signal: AbortSignal.timeout(interactive ? INTERACTIVE_TIMEOUT_MS : TIMEOUT_MS),
				});
				// the body can echo the email address, so it is never read or logged on errors
				if (!response.ok) throw new ListmonkApiError(response.status, operation);
				return ((await response.json()) as IListmonkResponse<T>).data;
			});

		return idempotent && !interactive
			? withRetry(send, {
					maxRetries: MAX_RETRIES,
					baseDelayMs: 250,
					maxDelayMs: 2000,
					isRetryable,
				})
			: send();
	}
}
