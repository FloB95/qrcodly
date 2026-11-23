import 'reflect-metadata';

jest.mock('@/core/config/env', () => ({
	env: {
		...jest.requireActual('@/core/config/env').env,
		UMAMI_HOST: 'https://umami.example.com',
		UMAMI_USERNAME: 'test_user',
		UMAMI_PASSWORD: 'test_password',
		UMAMI_WEBSITE: 'website_123',
	},
}));

jest.mock('@/core/metrics', () => ({
	...jest.requireActual('@/core/metrics'),
	trackExternal: jest.fn((_provider: string, _operation: string, fn: () => unknown) => fn()),
	umamiEventsTotal: { add: jest.fn() },
}));

import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { trackExternal, umamiEventsTotal } from '@/core/metrics';
import { UmamiClient, type IUmamiEventPayload, type IUmamiWebsiteQuery } from '..';

const jsonResponse = (data: unknown) => ({
	ok: true,
	status: 200,
	json: () => Promise.resolve(data),
});

const errorResponse = (status: number, body: string) => ({
	ok: false,
	status,
	text: () => Promise.resolve(body),
});

const query: IUmamiWebsiteQuery = {
	startAt: 1735689600000,
	endAt: 1767225600000,
	unit: 'day',
	path: '/u/abc12',
	timezone: 'Europe/Berlin',
};
const queryString =
	'startAt=1735689600000&endAt=1767225600000&unit=day&path=%2Fu%2Fabc12&timezone=Europe%2FBerlin';

describe('UmamiClient', () => {
	const originalFetch = global.fetch;
	let logger: MockProxy<Logger>;
	let mockFetch: jest.Mock;
	let timeout: jest.SpyInstance;
	let client: UmamiClient;

	beforeEach(() => {
		logger = mock<Logger>();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
		timeout = jest.spyOn(AbortSignal, 'timeout');
		client = new UmamiClient(logger);
	});

	afterEach(() => {
		global.fetch = originalFetch;
		timeout.mockRestore();
		jest.clearAllMocks();
	});

	describe('login', () => {
		it('logs in with the configured username and password before the first request', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ token: 'mock_jwt_token' }))
				.mockResolvedValueOnce(jsonResponse({ pageviews: 100 }));

			await client.getWebsiteStats(query);

			expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://umami.example.com/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: 'test_user',
					password: 'test_password',
				}),
			});
			expect(trackExternal).toHaveBeenNthCalledWith(1, 'umami', 'auth_token', expect.any(Function));
		});

		it('caches the token for subsequent requests', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ token: 'mock_jwt_token' }))
				.mockResolvedValueOnce(jsonResponse({ pageviews: 100 }))
				.mockResolvedValueOnce(jsonResponse({ pageviews: 200 }));

			await client.getWebsiteStats(query);
			await client.getWebsiteStats(query);

			const authCalls = mockFetch.mock.calls.filter(([url]) =>
				String(url).includes('/api/auth/login'),
			);
			expect(authCalls).toHaveLength(1);
			expect(mockFetch).toHaveBeenCalledTimes(3);
			expect(mockFetch.mock.calls[2][1]).toEqual({
				method: 'GET',
				headers: { Authorization: 'Bearer mock_jwt_token' },
			});
		});

		it('logs and throws when the login fails, without requesting the data', async () => {
			mockFetch.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));

			await expect(client.getWebsiteStats(query)).rejects.toThrow(
				'Failed to fetch auth token from Umami: 401 - Unauthorized',
			);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.fetchToken', {
				status: 401,
				body: 'Unauthorized',
			});
			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.fetchToken', {
				error: expect.any(Error),
			});
			expect(logger.error).not.toHaveBeenCalledWith('error.umamiApi.fetchData', expect.anything());
		});

		it('logs in again on the next request after a failed login', async () => {
			mockFetch
				.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))
				.mockResolvedValueOnce(jsonResponse({ token: 'mock_jwt_token' }))
				.mockResolvedValueOnce(jsonResponse({ pageviews: 100 }));

			await expect(client.getWebsiteStats(query)).rejects.toThrow();
			await expect(client.getWebsiteStats(query)).resolves.toEqual({ pageviews: 100 });

			expect(mockFetch.mock.calls[1][0]).toBe('https://umami.example.com/api/auth/login');
		});
	});

	describe('re-login', () => {
		const loginCalls = () =>
			mockFetch.mock.calls.filter(([url]) => String(url).includes('/api/auth/login'));
		const bearerOf = (call: unknown[]) =>
			(call[1] as { headers: Record<string, string> }).headers.Authorization;

		it('logs in again once and retries the request when Umami rejects the token', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ token: 'stale_token' }))
				.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'))
				.mockResolvedValueOnce(jsonResponse({ token: 'fresh_token' }))
				.mockResolvedValueOnce(jsonResponse({ pageviews: 100 }));

			await expect(client.getWebsiteStats(query)).resolves.toEqual({ pageviews: 100 });

			expect(mockFetch).toHaveBeenCalledTimes(4);
			expect(loginCalls()).toHaveLength(2);
			expect(bearerOf(mockFetch.mock.calls[1])).toBe('Bearer stale_token');
			expect(bearerOf(mockFetch.mock.calls[3])).toBe('Bearer fresh_token');
			expect(logger.warn).toHaveBeenCalledWith('umami.auth.relogin', { operation: 'fetch:stats' });
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('keeps the new token for later requests', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ token: 'stale_token' }))
				.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'))
				.mockResolvedValueOnce(jsonResponse({ token: 'fresh_token' }))
				.mockResolvedValueOnce(jsonResponse({ pageviews: 100 }))
				.mockResolvedValueOnce(jsonResponse({ pageviews: 200 }));

			await client.getWebsiteStats(query);
			await client.getWebsiteStats(query);

			expect(mockFetch).toHaveBeenCalledTimes(5);
			expect(loginCalls()).toHaveLength(2);
			expect(bearerOf(mockFetch.mock.calls[4])).toBe('Bearer fresh_token');
		});

		it('logs and throws as before when the retried request is rejected again', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ token: 'stale_token' }))
				.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'))
				.mockResolvedValueOnce(jsonResponse({ token: 'fresh_token' }))
				.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));

			await expect(client.getWebsiteStats(query)).rejects.toThrow(
				'Failed to fetch data from Umami: 401 - Unauthorized',
			);

			expect(mockFetch).toHaveBeenCalledTimes(4);
			expect(loginCalls()).toHaveLength(2);
			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.fetchData', {
				status: 401,
				body: 'Unauthorized',
			});
			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.fetchData', {
				error: expect.any(Error),
			});
		});

		it('shares one re-login between concurrent requests that see the rejected token', async () => {
			let logins = 0;
			mockFetch.mockImplementation((url: string, init: { headers: Record<string, string> }) => {
				if (url.endsWith('/api/auth/login')) {
					return Promise.resolve(jsonResponse({ token: `token_${++logins}` }));
				}
				return Promise.resolve(
					init.headers.Authorization === 'Bearer token_1'
						? errorResponse(401, 'Unauthorized')
						: jsonResponse({ pageviews: 100 }),
				);
			});

			await Promise.all([
				client.getWebsiteStats(query),
				client.getWebsitePageviews(query),
				client.getWebsiteMetrics({ ...query, type: 'os' }),
			]);

			// The first login plus a single re-login
			expect(loginCalls()).toHaveLength(2);
			const dataCalls = mockFetch.mock.calls.filter(([url]) => String(url).includes('/websites/'));
			expect(dataCalls.map(bearerOf).sort()).toEqual([
				'Bearer token_1',
				'Bearer token_1',
				'Bearer token_1',
				'Bearer token_2',
				'Bearer token_2',
				'Bearer token_2',
			]);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.error).not.toHaveBeenCalled();
		});
	});

	describe('website data', () => {
		beforeEach(() => {
			mockFetch.mockResolvedValueOnce(jsonResponse({ token: 'mock_jwt_token' }));
		});

		it.each([
			['stats', (c: UmamiClient) => c.getWebsiteStats(query), queryString],
			['pageviews', (c: UmamiClient) => c.getWebsitePageviews(query), queryString],
			[
				'metrics',
				(c: UmamiClient) => c.getWebsiteMetrics({ ...query, type: 'country' }),
				`${queryString}&type=country`,
			],
		])(
			'GETs /websites/{id}/%s of the configured host with the bearer token and the query in order',
			async (endpoint, call, expectedQuery) => {
				mockFetch.mockResolvedValueOnce(jsonResponse({}));

				await call(client);

				expect(mockFetch).toHaveBeenLastCalledWith(
					`https://umami.example.com/api/websites/website_123/${endpoint}?${expectedQuery}`,
					{
						method: 'GET',
						headers: { Authorization: 'Bearer mock_jwt_token' },
					},
				);
				// Last path segment only, so the website id never becomes a label
				expect(trackExternal).toHaveBeenLastCalledWith(
					'umami',
					`fetch:${endpoint}`,
					expect.any(Function),
				);
			},
		);

		it('returns the parsed response body', async () => {
			const metrics = [{ x: 'DE', y: 70 }];
			mockFetch.mockResolvedValueOnce(jsonResponse(metrics));

			await expect(client.getWebsiteMetrics({ ...query, type: 'country' })).resolves.toEqual(
				metrics,
			);
		});

		it.each([
			[404, 'Not Found'],
			[500, 'Internal Server Error'],
		])('logs the status and body and throws on a %s', async (status, body) => {
			mockFetch.mockResolvedValueOnce(errorResponse(status, body));

			await expect(client.getWebsiteStats(query)).rejects.toThrow(
				`Failed to fetch data from Umami: ${status} - ${body}`,
			);

			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.fetchData', { status, body });
			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.fetchData', {
				error: expect.any(Error),
			});
		});

		it('logs and rethrows a network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(client.getWebsiteStats(query)).rejects.toThrow('Network error');

			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.fetchData', {
				error: expect.any(Error),
			});
		});
	});

	describe('sendEvent', () => {
		const event: IUmamiEventPayload = {
			url: 'https://qrco.ly/u/abc12',
			hostname: 'qrco.ly',
			language: 'en-GB',
			referrer: '',
			userAgent: 'Mozilla/5.0',
			device: 'mobile',
			ip: '203.0.113.7',
		};

		const accepted = () => ({ ok: true, status: 200, text: async () => 'cache-token' });

		it('posts the event for the configured website, with user agent and IP headers and a 5 s timeout', async () => {
			mockFetch.mockResolvedValue(accepted());

			await client.sendEvent(event);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('https://umami.example.com/api/send', {
				method: 'POST',
				signal: expect.any(AbortSignal),
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Mozilla/5.0',
					'X-Client-Real-IP': '203.0.113.7',
				},
				body: JSON.stringify({
					type: 'event',
					payload: {
						website: 'website_123',
						url: 'https://qrco.ly/u/abc12',
						hostname: 'qrco.ly',
						language: 'en-GB',
						referrer: '',
						userAgent: 'Mozilla/5.0',
						device: 'mobile',
						ip: '203.0.113.7',
					},
				}),
			});
			expect(timeout).toHaveBeenCalledWith(5000);
			expect(trackExternal).toHaveBeenCalledWith('umami', 'send_event', expect.any(Function));
		});

		it('leaves an unset device out of the body entirely', async () => {
			mockFetch.mockResolvedValue(accepted());

			await client.sendEvent({ ...event, device: undefined });

			const [, init] = mockFetch.mock.calls[0] as [string, { body: string }];
			const sent = (JSON.parse(init.body) as { payload: Record<string, unknown> }).payload;
			expect(sent).not.toHaveProperty('device');
		});

		it('reports accepted when Umami echoes a cache token', async () => {
			mockFetch.mockResolvedValue(accepted());

			await expect(client.sendEvent(event)).resolves.toBe('accepted');
			expect(logger.warn).not.toHaveBeenCalled();
			expect(logger.error).not.toHaveBeenCalled();
			expect(umamiEventsTotal.add).toHaveBeenCalledWith(1, { outcome: 'accepted' });
		});

		it.each(['', '  \n'])(
			'reports discarded when Umami answers 200 with an empty body (%p)',
			async (body) => {
				mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => body });

				await expect(client.sendEvent(event)).resolves.toBe('discarded');
				expect(logger.warn).toHaveBeenCalledWith('umami.event.discarded', {
					reason: 'empty_200_response',
					userAgent: event.userAgent,
					hostname: event.hostname,
				});
				expect(umamiEventsTotal.add).toHaveBeenCalledWith(1, { outcome: 'discarded' });
			},
		);

		it('reports rejected and logs the status when Umami returns an error response', async () => {
			mockFetch.mockResolvedValue(errorResponse(400, 'bad payload'));

			await expect(client.sendEvent(event)).resolves.toBe('rejected');
			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.sendEvent', {
				status: 400,
				body: 'bad payload',
				userAgent: event.userAgent,
			});
			expect(umamiEventsTotal.add).toHaveBeenCalledWith(1, { outcome: 'rejected', status: 400 });
		});

		it('logs at most 500 characters of an error body', async () => {
			mockFetch.mockResolvedValue(errorResponse(500, 'x'.repeat(600)));

			await client.sendEvent(event);

			expect(logger.error).toHaveBeenCalledWith(
				'error.umamiApi.sendEvent',
				expect.objectContaining({ body: 'x'.repeat(500) }),
			);
		});

		it('does not throw and logs when the Umami request fails', async () => {
			mockFetch.mockRejectedValue(new Error('network'));

			await expect(client.sendEvent(event)).resolves.toBe('error');
			expect(logger.error).toHaveBeenCalledWith('error.umamiApi.sendEvent', {
				error: expect.any(Error),
				userAgent: event.userAgent,
			});
			expect(umamiEventsTotal.add).toHaveBeenCalledWith(1, { outcome: 'error' });
		});
	});
});
