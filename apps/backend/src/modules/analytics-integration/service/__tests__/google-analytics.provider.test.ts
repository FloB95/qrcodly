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
		it('should validate via debug endpoint then send to collect endpoint', async () => {
			// Debug endpoint returns success
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});
			// Collect endpoint returns success
			mockFetch.mockResolvedValueOnce({
				ok: true,
			});

			await provider.sendEvent(baseScanEvent, validCredentials);

			expect(mockFetch).toHaveBeenCalledTimes(2);

			// First call should be to debug endpoint
			const debugCall = mockFetch.mock.calls[0];
			expect(debugCall[0]).toContain('/debug/mp/collect');
			expect(debugCall[0]).toContain('measurement_id=G-ABCDEF1234');
			expect(debugCall[0]).toContain('api_secret=test_api_secret');

			// Second call should be to collect endpoint
			const collectCall = mockFetch.mock.calls[1];
			expect(collectCall[0]).toContain('/mp/collect');
			expect(collectCall[0]).not.toContain('/debug/');
		});

		it('should send page_view event with correct params', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});
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
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const headers = mockFetch.mock.calls[0][1].headers;
			expect(headers['User-Agent']).toBeUndefined();
		});

		it('should throw with validation details when debug endpoint reports errors', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						validationMessages: [
							{
								fieldPath: 'events[0].name',
								description: 'Event name is reserved.',
								validationCode: 'NAME_RESERVED',
							},
						],
					}),
			});

			await expect(provider.sendEvent(baseScanEvent, validCredentials)).rejects.toThrow(
				'GA4 validation failed',
			);

			// Should NOT have called the collect endpoint
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should throw when debug endpoint returns non-OK status', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

			await expect(provider.sendEvent(baseScanEvent, validCredentials)).rejects.toThrow(
				'GA4 debug endpoint returned status 500',
			);
		});

		it('should throw when collect endpoint returns non-OK status', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});
			mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

			await expect(provider.sendEvent(baseScanEvent, validCredentials)).rejects.toThrow(
				'GA4 collect endpoint returned status 503',
			);
		});

		it('should generate a random client_id', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
			expect(body.client_id).toBeDefined();
			expect(typeof body.client_id).toBe('string');
			expect(body.client_id).toMatch(/^\d+\.\d+$/);
		});
	});

	describe('validateCredentials', () => {
		it('should return true when debug endpoint reports no validation errors', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ validationMessages: [] }),
			});

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toBe(true);
			expect(mockFetch.mock.calls[0][0]).toContain('/debug/mp/collect');
		});

		it('should return false when debug endpoint reports validation errors', async () => {
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

			expect(result).toBe(false);
		});

		it('should return false when debug endpoint returns non-OK status', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toBe(false);
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
