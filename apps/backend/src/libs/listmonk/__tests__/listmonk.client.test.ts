import 'reflect-metadata';

jest.mock('@/core/config/env', () => ({
	env: {
		...jest.requireActual('@/core/config/env').env,
		LISTMONK_URL: 'https://newsletter.test/',
		LISTMONK_API_USER: 'qrcodly-api',
		LISTMONK_API_TOKEN: 'secret-token',
		LISTMONK_LIST_ID: 7,
	},
}));

jest.mock('@/utils/general', () => ({
	...jest.requireActual('@/utils/general'),
	sleep: jest.fn().mockResolvedValue(undefined),
}));

import { env } from '@/core/config/env';
import { ListmonkApiError, ListmonkClient, type IListmonkSubscriber } from '..';

const jsonResponse = (data: unknown, status = 200) =>
	({ ok: status < 400, status, json: () => Promise.resolve({ data }) }) as Response;

const subscriber = (overrides: Partial<IListmonkSubscriber> = {}): IListmonkSubscriber => ({
	id: 1,
	email: 'jane@example.com',
	name: 'Jane',
	status: 'enabled',
	attribs: {},
	lists: [],
	...overrides,
});

const byClerkId = { key: 'clerk_user_id', value: 'user_1' };

describe('ListmonkClient', () => {
	const mutableEnv = env as unknown as Record<string, unknown>;
	const originalFetch = global.fetch;
	let mockFetch: jest.Mock;
	let timeout: jest.SpyInstance;
	let client: ListmonkClient;

	const lastCall = () => {
		const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1] as [
			string,
			RequestInit,
		];
		return {
			url: new URL(url),
			init,
			body: init.body ? JSON.parse(init.body as string) : undefined,
		};
	};

	beforeEach(() => {
		mutableEnv.LISTMONK_URL = 'https://newsletter.test/';
		mutableEnv.LISTMONK_API_TOKEN = 'secret-token';
		mockFetch = jest.fn();
		global.fetch = mockFetch;
		timeout = jest.spyOn(AbortSignal, 'timeout');
		client = new ListmonkClient();
	});

	afterEach(() => {
		global.fetch = originalFetch;
		timeout.mockRestore();
		jest.clearAllMocks();
	});

	it('is disabled and never calls listmonk while a variable is missing', async () => {
		mutableEnv.LISTMONK_API_TOKEN = undefined;

		expect(client.isEnabled()).toBe(false);
		expect(() => client.getListId()).toThrow('not configured');
		await expect(client.findSubscribers({ attribute: byClerkId })).rejects.toThrow(
			'not configured',
		);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns the configured list id', () => {
		expect(client.isEnabled()).toBe(true);
		expect(client.getListId()).toBe(7);
	});

	describe('findSubscribers', () => {
		// listmonk appends the expression as `AND %query%`; without parentheses the OR would escape
		// the conditions in front of it
		it('matches an attribute or the email with an escaped, parenthesized SQL expression', async () => {
			mockFetch.mockResolvedValue(jsonResponse({ results: [subscriber()] }));

			const result = await client.findSubscribers({
				attribute: byClerkId,
				email: "o'hara@example.com",
			});

			expect(result).toHaveLength(1);
			const { url, init } = lastCall();
			expect(url.origin + url.pathname).toBe('https://newsletter.test/api/subscribers');
			expect(url.searchParams.get('query')).toBe(
				"(subscribers.attribs->>'clerk_user_id' = 'user_1' OR " +
					"LOWER(subscribers.email) = LOWER('o''hara@example.com'))",
			);
			expect(init.method).toBe('GET');
			expect((init.headers as Record<string, string>).Authorization).toBe(
				'token qrcodly-api:secret-token',
			);
		});

		it.each([
			[
				'the attribute only',
				{ attribute: byClerkId, email: null },
				"(subscribers.attribs->>'clerk_user_id' = 'user_1')",
			],
			[
				'the email only',
				{ email: 'jane@example.com' },
				"(LOWER(subscribers.email) = LOWER('jane@example.com'))",
			],
		])('matches %s', async (_, lookup, query) => {
			mockFetch.mockResolvedValue(jsonResponse({ results: [] }));

			await client.findSubscribers(lookup);

			expect(lastCall().url.searchParams.get('query')).toBe(query);
		});

		it('escapes quotes in an attribute value', async () => {
			mockFetch.mockResolvedValue(jsonResponse({ results: [] }));

			await client.findSubscribers({ attribute: { key: 'clerk_user_id', value: "x' OR '1'='1" } });

			expect(lastCall().url.searchParams.get('query')).toBe(
				"(subscribers.attribs->>'clerk_user_id' = 'x'' OR ''1''=''1')",
			);
		});

		it.each(["id' OR 1=1 --", 'Clerk_User_Id', 'clerk-user-id', 'a b', '1abc', ''])(
			'rejects the attribute key %p without calling listmonk',
			async (key) => {
				await expect(client.findSubscribers({ attribute: { key, value: 'x' } })).rejects.toThrow(
					'Invalid listmonk attribute key',
				);
				expect(mockFetch).not.toHaveBeenCalled();
			},
		);

		it('finds nobody without a criterion instead of matching every subscriber', async () => {
			await expect(client.findSubscribers({ email: null })).resolves.toEqual([]);
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('listAllSubscribers', () => {
		const subscribers = (from: number, count: number) =>
			Array.from({ length: count }, (_, i) => subscriber({ id: from + i }));

		it('pages through all subscribers in ascending order', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ results: subscribers(1, 1000), total: 1001 }))
				.mockResolvedValueOnce(jsonResponse({ results: subscribers(1001, 1), total: 1001 }));

			const result = await client.listAllSubscribers();

			expect(result).toHaveLength(1001);
			expect(mockFetch).toHaveBeenCalledTimes(2);
			const { url } = lastCall();
			expect(url.searchParams.get('page')).toBe('2');
			expect(url.searchParams.get('per_page')).toBe('1000');
			expect(url.searchParams.get('order')).toBe('asc');
		});

		it('stops after one request when the first page holds everything', async () => {
			mockFetch.mockResolvedValue(jsonResponse({ results: subscribers(1, 1000), total: 1000 }));

			await expect(client.listAllSubscribers()).resolves.toHaveLength(1000);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('keeps paging when listmonk caps the page size', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ results: subscribers(1, 50), total: 120 }))
				.mockResolvedValueOnce(jsonResponse({ results: subscribers(51, 50), total: 120 }))
				.mockResolvedValueOnce(jsonResponse({ results: subscribers(101, 20), total: 120 }));

			const result = await client.listAllSubscribers();

			expect(result.map(({ id }) => id)).toEqual(Array.from({ length: 120 }, (_, i) => i + 1));
			expect(mockFetch).toHaveBeenCalledTimes(3);
			expect(lastCall().url.searchParams.get('page')).toBe('3');
		});

		it('stops at an empty page even when the total was never reached', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ results: subscribers(1, 1000), total: 1001 }))
				.mockResolvedValueOnce(jsonResponse({ results: [], total: 1001 }));

			await expect(client.listAllSubscribers()).resolves.toHaveLength(1000);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('returns nothing for an empty listmonk', async () => {
			mockFetch.mockResolvedValue(jsonResponse({ results: [], total: 0 }));

			await expect(client.listAllSubscribers()).resolves.toEqual([]);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	it('creates a preconfirmed, enabled subscriber and does not retry the POST', async () => {
		mockFetch.mockResolvedValue(jsonResponse(null, 502));

		await expect(
			client.createSubscriber({
				email: 'jane@example.com',
				name: 'Jane',
				attribs: { clerk_user_id: 'user_1' },
				listIds: [7],
			}),
		).rejects.toBeInstanceOf(ListmonkApiError);

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const { init, body } = lastCall();
		expect(init.method).toBe('POST');
		expect(body).toEqual({
			email: 'jane@example.com',
			name: 'Jane',
			status: 'enabled',
			attribs: { clerk_user_id: 'user_1' },
			lists: [7],
			preconfirm_subscriptions: true,
		});
	});

	it('returns the created subscriber', async () => {
		mockFetch.mockResolvedValue(jsonResponse(subscriber({ id: 12 })));

		await expect(
			client.createSubscriber({ email: 'a@b.de', name: 'a', attribs: {}, listIds: [] }),
		).resolves.toMatchObject({ id: 12 });
	});

	it('reports a duplicate email as ListmonkApiError 409', async () => {
		mockFetch.mockResolvedValue(jsonResponse(null, 409));

		await expect(
			client.createSubscriber({ email: 'a@b.de', name: 'a', attribs: {}, listIds: [] }),
		).rejects.toMatchObject({ status: 409 });
	});

	it('updates with PATCH and without lists, so memberships stay untouched', async () => {
		mockFetch.mockResolvedValue(jsonResponse(subscriber()));

		await client.updateSubscriber(5, { email: 'new@example.com' });

		const { url, init, body } = lastCall();
		expect(init.method).toBe('PATCH');
		expect(url.pathname).toBe('/api/subscribers/5');
		expect(body).not.toHaveProperty('lists');
		expect(body).toEqual({ email: 'new@example.com', preconfirm_subscriptions: true });
	});

	it.each(['confirmed', 'unsubscribed'] as const)(
		'adds to the configured list as %s',
		async (status) => {
			mockFetch.mockResolvedValue(jsonResponse(true));

			await client.addToList(5, status);

			const { url, init, body } = lastCall();
			expect(init.method).toBe('PUT');
			expect(url.pathname).toBe('/api/subscribers/lists');
			expect(body).toEqual({ ids: [5], action: 'add', target_list_ids: [7], status });
		},
	);

	it('unsubscribes from the configured list', async () => {
		mockFetch.mockResolvedValue(jsonResponse(true));

		await client.unsubscribeFromList(5);

		expect(lastCall().body).toEqual({ ids: [5], action: 'unsubscribe', target_list_ids: [7] });
	});

	it('replaces a subscriber with PUT, dropping its list memberships', async () => {
		mockFetch.mockResolvedValue(jsonResponse(true));

		await client.replaceSubscriber(5, {
			email: 'gone@example.com',
			name: 'gone@example.com',
			status: 'blocklisted',
			attribs: {},
		});

		const { url, init, body } = lastCall();
		expect(init.method).toBe('PUT');
		expect(url.pathname).toBe('/api/subscribers/5');
		expect(body).toEqual({
			email: 'gone@example.com',
			name: 'gone@example.com',
			status: 'blocklisted',
			attribs: {},
			lists: [],
			preconfirm_subscriptions: true,
		});
	});

	it('deletes a subscriber', async () => {
		mockFetch.mockResolvedValue(jsonResponse(true));

		await client.deleteSubscriber(5);

		const { url, init } = lastCall();
		expect(init.method).toBe('DELETE');
		expect(url.pathname).toBe('/api/subscribers/5');
	});

	describe('retries and timeouts', () => {
		it('retries idempotent calls on 502-504 and timeouts', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse(null, 503))
				.mockRejectedValueOnce(Object.assign(new Error('timed out'), { name: 'TimeoutError' }))
				.mockResolvedValueOnce(jsonResponse({ results: [] }));

			await expect(client.findSubscribers({ attribute: byClerkId })).resolves.toEqual([]);
			expect(mockFetch).toHaveBeenCalledTimes(3);
			expect(timeout).toHaveBeenCalledWith(5000);
		});

		it.each([
			['a 429', () => Promise.resolve(jsonResponse(null, 429))],
			['a network error', () => Promise.reject(new TypeError('fetch failed'))],
		])('retries after %s and gives up after two retries', async (_, fail) => {
			mockFetch.mockImplementation(fail);

			await expect(client.deleteSubscriber(5)).rejects.toBeDefined();
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});

		it.each([403, 500])('does not retry a %s', async (status) => {
			mockFetch.mockResolvedValue(jsonResponse(null, status));

			await expect(
				client.updateSubscriber(5, { email: 'taken@example.com' }),
			).rejects.toMatchObject({ status });
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('fails fast for an interactive call: shorter timeout, no retries', async () => {
			mockFetch.mockResolvedValue(jsonResponse(null, 503));

			await expect(
				client.findSubscribers({ attribute: byClerkId }, { interactive: true }),
			).rejects.toMatchObject({ status: 503 });

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(timeout).toHaveBeenCalledWith(3000);
		});

		it.each([
			[
				'updateSubscriber',
				(c: ListmonkClient) => c.updateSubscriber(5, { name: 'x' }, { interactive: true }),
			],
			['addToList', (c: ListmonkClient) => c.addToList(5, 'confirmed', { interactive: true })],
			[
				'unsubscribeFromList',
				(c: ListmonkClient) => c.unsubscribeFromList(5, { interactive: true }),
			],
			[
				'createSubscriber',
				(c: ListmonkClient) =>
					c.createSubscriber(
						{ email: 'a@b.de', name: 'a', attribs: {}, listIds: [] },
						{ interactive: true },
					),
			],
		])('passes the interactive option on for %s', async (_, call) => {
			mockFetch.mockResolvedValue(jsonResponse(null, 504));

			await expect(call(client)).rejects.toMatchObject({ status: 504 });

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(timeout).toHaveBeenCalledWith(3000);
		});
	});

	it('keeps the response body, which can echo the email, out of the error', async () => {
		const json = jest.fn();
		mockFetch.mockResolvedValue({ ok: false, status: 409, json });

		await expect(
			client.createSubscriber({
				email: 'jane@example.com',
				name: 'Jane',
				attribs: {},
				listIds: [],
			}),
		).rejects.toThrow(/^listmonk subscribers\.create returned 409$/);
		expect(json).not.toHaveBeenCalled();
	});
});
