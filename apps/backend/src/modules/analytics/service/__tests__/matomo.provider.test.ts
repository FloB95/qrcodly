import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { MatomoApiError, type MatomoClient, type TMatomoSiteCheck } from '@/libs/matomo';
import { MatomoProvider } from '../providers/matomo.provider';
import type { IScanEventData } from '../providers/analytics-provider.interface';

describe('MatomoProvider', () => {
	let provider: MatomoProvider;
	let client: MockProxy<MatomoClient>;

	const baseScanEvent: IScanEventData = {
		url: 'https://example.com/landing',
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
		hostname: 'example.com',
		language: 'de-DE',
		referrer: 'https://google.com',
		ip: '10.0.0.0',
		deviceType: 'desktop',
		browserName: 'Chrome',
	};

	const validCredentials = {
		matomoUrl: 'https://matomo.example.com',
		siteId: '5',
	};

	const credentialsWithAuth = {
		...validCredentials,
		authToken: 'abc123tokenxyz',
	};

	beforeEach(() => {
		client = mock<MatomoClient>();
		client.track.mockResolvedValue(undefined);
		provider = new MatomoProvider(client);
	});

	describe('sendEvent', () => {
		it('should track the scan as a page view with the scan data', async () => {
			await provider.sendEvent(baseScanEvent, validCredentials);

			expect(client.track).toHaveBeenCalledTimes(1);
			expect(client.track).toHaveBeenCalledWith('https://matomo.example.com', {
				siteId: '5',
				actionName: 'QR Code Scan',
				url: 'https://example.com/landing',
				referrer: 'https://google.com',
				language: 'de-DE',
				customVariables: {
					'1': ['Device Type', 'desktop'],
					'2': ['Browser', 'Chrome'],
				},
				auth: undefined,
			});
		});

		it('should send the auth token with the anonymized scanner IP when an auth token is set', async () => {
			await provider.sendEvent({ ...baseScanEvent, ip: '203.0.113.42' }, credentialsWithAuth);

			expect(client.track.mock.calls[0][1].auth).toEqual({
				token: 'abc123tokenxyz',
				clientIp: '203.0.113.0',
			});
		});

		it('should not send auth or the scanner IP without an auth token', async () => {
			await provider.sendEvent(baseScanEvent, validCredentials);

			expect(client.track.mock.calls[0][1].auth).toBeUndefined();
		});

		it('should throw when the Matomo request fails', async () => {
			client.track.mockRejectedValueOnce(new MatomoApiError(500));

			await expect(provider.sendEvent(baseScanEvent, validCredentials)).rejects.toThrow(
				'Matomo request failed with status 500',
			);
		});

		it('should reject URLs the client refuses', async () => {
			client.track.mockRejectedValueOnce(
				new Error('Matomo URL must not point to a private or internal address'),
			);

			await expect(
				provider.sendEvent(baseScanEvent, { ...validCredentials, matomoUrl: 'https://localhost' }),
			).rejects.toThrow('private or internal');
		});
	});

	describe('validateCredentials', () => {
		it('should check the site with URL, site id and auth token', async () => {
			client.checkSite.mockResolvedValueOnce('accepted');

			await provider.validateCredentials(credentialsWithAuth);

			expect(client.checkSite).toHaveBeenCalledWith(
				'https://matomo.example.com',
				'5',
				'abc123tokenxyz',
			);
		});

		it('should check the site without auth token when none is set', async () => {
			client.checkSite.mockResolvedValueOnce('accepted');

			await provider.validateCredentials(validCredentials);

			expect(client.checkSite).toHaveBeenCalledWith('https://matomo.example.com', '5', undefined);
		});

		it.each<[TMatomoSiteCheck, { valid: boolean; credentialsVerified: boolean }]>([
			['accepted', { valid: true, credentialsVerified: true }],
			['rejected', { valid: false, credentialsVerified: true }],
			['unreachable', { valid: false, credentialsVerified: false }],
		])('should map a site check of %s to %o', async (check, expected) => {
			client.checkSite.mockResolvedValueOnce(check);

			const result = await provider.validateCredentials(credentialsWithAuth);

			expect(result).toEqual(expected);
		});

		it('should reject URLs the client refuses', async () => {
			client.checkSite.mockRejectedValueOnce(
				new Error('Matomo URL must not point to a private or internal address'),
			);

			await expect(
				provider.validateCredentials({ ...validCredentials, matomoUrl: 'https://localhost' }),
			).rejects.toThrow('private or internal');
		});
	});
});
