import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { Ga4ApiError, type Ga4Client } from '@/libs/ga4';
import { GoogleAnalyticsProvider } from '../providers/google-analytics.provider';
import type { IScanEventData } from '../providers/analytics-provider.interface';

describe('GoogleAnalyticsProvider', () => {
	let provider: GoogleAnalyticsProvider;
	let ga4Client: MockProxy<Ga4Client>;

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
		ga4Client = mock<Ga4Client>();
		provider = new GoogleAnalyticsProvider(ga4Client);
	});

	describe('sendEvent', () => {
		it('should send directly to collect endpoint', async () => {
			ga4Client.collect.mockResolvedValueOnce();

			await provider.sendEvent(baseScanEvent, validCredentials);

			expect(ga4Client.collect).toHaveBeenCalledTimes(1);
			expect(ga4Client.validate).not.toHaveBeenCalled();
			expect(ga4Client.collect.mock.calls[0][0]).toEqual({
				measurementId: 'G-ABCDEF1234',
				apiSecret: 'test_api_secret',
			});
		});

		it('should send page_view event with correct params', async () => {
			ga4Client.collect.mockResolvedValueOnce();

			await provider.sendEvent(baseScanEvent, validCredentials);

			const payload = ga4Client.collect.mock.calls[0][1];
			expect(payload.events).toHaveLength(1);
			expect(payload.events[0].name).toBe('page_view');
			expect(payload.events[0].params).toEqual({
				page_location: 'https://example.com/landing',
				page_title: 'QR Code Scan',
				page_referrer: '',
				language: 'en-US',
				source: 'qr_code',
			});
		});

		it('should send the anonymized IP', async () => {
			ga4Client.collect.mockResolvedValueOnce();

			await provider.sendEvent({ ...baseScanEvent, ip: '203.0.113.42' }, validCredentials);

			expect(ga4Client.collect.mock.calls[0][1].ip_override).toBe('203.0.113.0');
		});

		it('should not forward the User-Agent to protect privacy', async () => {
			ga4Client.collect.mockResolvedValueOnce();

			await provider.sendEvent(baseScanEvent, validCredentials);

			expect(JSON.stringify(ga4Client.collect.mock.calls[0])).not.toContain(
				baseScanEvent.userAgent,
			);
		});

		it('should throw when collect endpoint returns non-OK status', async () => {
			ga4Client.collect.mockRejectedValueOnce(new Ga4ApiError(503, 'collect'));

			await expect(provider.sendEvent(baseScanEvent, validCredentials)).rejects.toThrow(
				'GA4 collect endpoint returned status 503',
			);
		});

		it('should generate a random client_id', async () => {
			ga4Client.collect.mockResolvedValueOnce();

			await provider.sendEvent(baseScanEvent, validCredentials);

			const payload = ga4Client.collect.mock.calls[0][1];
			expect(payload.client_id).toBeDefined();
			expect(typeof payload.client_id).toBe('string');
			expect(payload.client_id).toMatch(/^\d+\.\d+$/);
		});
	});

	describe('validateCredentials', () => {
		it('should return valid with credentialsVerified: false when debug endpoint passes', async () => {
			ga4Client.validate.mockResolvedValueOnce(true);

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: true, credentialsVerified: false });
			expect(ga4Client.validate).toHaveBeenCalledTimes(1);
			expect(ga4Client.collect).not.toHaveBeenCalled();
			expect(ga4Client.validate.mock.calls[0][0]).toEqual({
				measurementId: 'G-ABCDEF1234',
				apiSecret: 'test_api_secret',
			});
		});

		it('should always return credentialsVerified: false (GA4 cannot verify credentials)', async () => {
			ga4Client.validate.mockResolvedValueOnce(false);

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: false });
		});

		it('should return valid: false when debug endpoint returns non-OK status', async () => {
			ga4Client.validate.mockRejectedValueOnce(new Ga4ApiError(401, 'debug'));

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: false });
		});

		it('should return valid: false when fetch throws', async () => {
			ga4Client.validate.mockRejectedValueOnce(new Error('Network error'));

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: false });
		});

		it('should send a page_view event for validation', async () => {
			ga4Client.validate.mockResolvedValueOnce(true);

			await provider.validateCredentials(validCredentials);

			expect(ga4Client.validate.mock.calls[0][1]).toEqual({
				client_id: 'test_validation',
				events: [
					{
						name: 'page_view',
						params: { page_location: 'https://example.com/test', page_title: 'Test' },
					},
				],
			});
		});
	});
});
