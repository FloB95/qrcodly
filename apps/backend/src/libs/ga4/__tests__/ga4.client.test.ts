import 'reflect-metadata';

jest.mock('@/core/metrics', () => ({
	...jest.requireActual('@/core/metrics'),
	trackExternal: jest.fn((_provider: string, _operation: string, fn: () => Promise<unknown>) =>
		fn(),
	),
}));

import { trackExternal } from '@/core/metrics';
import { Ga4ApiError, Ga4Client, type IGa4Payload } from '..';

const credentials = { measurementId: 'G-ABCDEF1234', apiSecret: 'test_api_secret' };

const payload: IGa4Payload = {
	client_id: '123.456',
	ip_override: '192.168.1.0',
	events: [{ name: 'page_view', params: { page_location: 'https://example.com/landing' } }],
};

describe('Ga4Client', () => {
	const originalFetch = global.fetch;
	let mockFetch: jest.Mock;
	let timeout: jest.SpyInstance;
	let client: Ga4Client;

	const lastCall = () => {
		const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1] as [
			string,
			RequestInit,
		];
		return { url, init };
	};

	beforeEach(() => {
		mockFetch = jest.fn();
		global.fetch = mockFetch;
		timeout = jest.spyOn(AbortSignal, 'timeout');
		client = new Ga4Client();
	});

	afterEach(() => {
		global.fetch = originalFetch;
		timeout.mockRestore();
		jest.clearAllMocks();
	});

	describe('collect', () => {
		it('posts the payload to the collect endpoint, not the debug endpoint', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.collect(credentials, payload);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const { url, init } = lastCall();
			expect(url).toBe(
				'https://www.google-analytics.com/mp/collect' +
					'?measurement_id=G-ABCDEF1234&api_secret=test_api_secret',
			);
			expect(url).not.toContain('/debug/');
			expect(init.method).toBe('POST');
			expect(init.body).toBe(JSON.stringify(payload));
			expect(timeout).toHaveBeenCalledWith(5000);
			expect(trackExternal).toHaveBeenCalledWith(
				'google_analytics',
				'collect',
				expect.any(Function),
			);
		});

		it('does not forward a User-Agent header to protect privacy', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.collect(credentials, payload);

			const headers = lastCall().init.headers as Record<string, string>;
			expect(headers).toEqual({ 'Content-Type': 'application/json' });
			expect(headers['User-Agent']).toBeUndefined();
		});

		it('throws when the collect endpoint returns a non-OK status', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

			const error = await client.collect(credentials, payload).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(Ga4ApiError);
			expect(error).toMatchObject({
				status: 503,
				message: 'GA4 collect endpoint returned status 503',
			});
		});

		it('passes a network error on', async () => {
			mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

			await expect(client.collect(credentials, payload)).rejects.toThrow('fetch failed');
		});
	});

	describe('validate', () => {
		it('posts the payload to the debug endpoint', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});

			await client.validate(credentials, payload);

			const { url, init } = lastCall();
			expect(url).toBe(
				'https://www.google-analytics.com/debug/mp/collect' +
					'?measurement_id=G-ABCDEF1234&api_secret=test_api_secret',
			);
			expect(init.method).toBe('POST');
			expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
			expect(init.body).toBe(JSON.stringify(payload));
			expect(timeout).toHaveBeenCalledWith(5000);
			expect(trackExternal).toHaveBeenCalledWith(
				'google_analytics',
				'validate',
				expect.any(Function),
			);
		});

		it.each([
			['empty validationMessages', { validationMessages: [] }],
			['no validationMessages', {}],
		])('is valid when the debug endpoint answers with %s', async (_, answer) => {
			mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(answer) });

			await expect(client.validate(credentials, payload)).resolves.toBe(true);
		});

		it('is invalid when the debug endpoint reports validation messages', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						validationMessages: [
							{
								fieldPath: 'measurement_id',
								description: 'Invalid measurement ID.',
								validationCode: 'INVALID_MEASUREMENT_ID',
							},
						],
					}),
			});

			await expect(client.validate(credentials, payload)).resolves.toBe(false);
		});

		it('throws on a non-OK status without reading the body', async () => {
			const json = jest.fn();
			mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json });

			await expect(client.validate(credentials, payload)).rejects.toMatchObject({
				status: 401,
				message: 'GA4 debug endpoint returned status 401',
			});
			expect(json).not.toHaveBeenCalled();
		});

		it('passes a network error on', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(client.validate(credentials, payload)).rejects.toThrow('Network error');
		});
	});
});
