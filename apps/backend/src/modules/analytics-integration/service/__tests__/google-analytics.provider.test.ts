import 'reflect-metadata';
import { GoogleAnalyticsProvider } from '../providers/google-analytics.provider';
import type { IScanEventData } from '../providers/analytics-provider.interface';

describe('GoogleAnalyticsProvider', () => {
	let provider: GoogleAnalyticsProvider;
	let mockFetch: jest.Mock;
	const originalFetch = global.fetch;

	const baseScanEvent: IScanEventData = {
		url: 'https://example.com/landing',
		userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
		hostname: 'example.com',
		language: 'en-US',
		referrer: '',
		ip: '192.168.1.0',
		deviceType: 'mobile',
		browserName: 'Safari',
	};

	const validCredentials = {
		measurementId: 'G-ABCDEF1234',
		apiSecret: 'test_api_secret',
	};

	beforeEach(() => {
		provider = new GoogleAnalyticsProvider();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	describe('sendEvent', () => {
		it('should send directly to collect endpoint', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			expect(mockFetch).toHaveBeenCalledTimes(1);

			const call = mockFetch.mock.calls[0];
			expect(call[0]).toContain('/mp/collect');
			expect(call[0]).not.toContain('/debug/');
			expect(call[0]).toContain('measurement_id=G-ABCDEF1234');
			expect(call[0]).toContain('api_secret=test_api_secret');
		});

		it('should send page_view event with correct params', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			expect(body.events).toHaveLength(1);
			expect(body.events[0].name).toBe('page_view');
			expect(body.events[0].params.page_location).toBe('https://example.com/landing');
			expect(body.events[0].params.page_title).toBe('QR Code Scan');
			expect(body.events[0].params.source).toBe('qr_code');
			expect(body.events[0].params.language).toBe('en-US');
		});

		it('should not forward User-Agent header to protect privacy', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const headers = mockFetch.mock.calls[0][1].headers;
			expect(headers['User-Agent']).toBeUndefined();
		});

		it('should throw when collect endpoint returns non-OK status', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

			await expect(provider.sendEvent(baseScanEvent, validCredentials)).rejects.toThrow(
				'GA4 collect endpoint returned status 503',
			);
		});

		it('should generate a random client_id', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			expect(body.client_id).toBeDefined();
			expect(typeof body.client_id).toBe('string');
			expect(body.client_id).toMatch(/^\d+\.\d+$/);
		});
	});

	describe('validateCredentials', () => {
		it('should return valid with credentialsVerified: false when debug endpoint passes', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: true, credentialsVerified: false });
			expect(mockFetch.mock.calls[0][0]).toContain('/debug/mp/collect');
		});

		it('should always return credentialsVerified: false (GA4 cannot verify credentials)', async () => {
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

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: false });
		});

		it('should return valid: false when debug endpoint returns non-OK status', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: false });
		});

		it('should return valid: false when fetch throws', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: false });
		});

		it('should send a page_view event for validation', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});

			await provider.validateCredentials(validCredentials);

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			expect(body.events[0].name).toBe('page_view');
		});
	});
});
