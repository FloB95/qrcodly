import 'reflect-metadata';
import { MatomoProvider } from '../providers/matomo.provider';
import type { IScanEventData } from '../providers/analytics-provider.interface';

describe('MatomoProvider', () => {
	let provider: MatomoProvider;
	let mockFetch: jest.Mock;

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
		provider = new MatomoProvider();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('sendEvent', () => {
		it('should send tracking request to matomo.php', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			expect(mockFetch).toHaveBeenCalledTimes(1);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('https://matomo.example.com/matomo.php');
			expect(url).toContain('idsite=5');
			expect(url).toContain('rec=1');
		});

		it('should include scan event data as URL params', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain(encodeURIComponent('https://example.com/landing'));
			expect(url).toContain('action_name=QR+Code+Scan');
			expect(url).toContain('lang=de-DE');
		});

		it('should include auth token when provided', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, credentialsWithAuth);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('token_auth=abc123tokenxyz');
		});

		it('should not include auth token when not provided', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).not.toContain('token_auth');
		});

		it('should pass custom variables with device type and browser', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const url = mockFetch.mock.calls[0][0] as string;
			const urlObj = new URL(url);
			const cvar = urlObj.searchParams.get('_cvar');
			expect(cvar).toBeDefined();

			const parsed = JSON.parse(cvar!) as Record<string, string[]>;
			expect(parsed['1']).toEqual(['Device Type', 'desktop']);
			expect(parsed['2']).toEqual(['Browser', 'Chrome']);
		});

		it('should handle trailing slash in matomo URL', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, {
				...validCredentials,
				matomoUrl: 'https://matomo.example.com/',
			});

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('matomo.example.com/matomo.php');
		});

		it('should reject URLs pointing to private/internal addresses', async () => {
			await expect(
				provider.sendEvent(baseScanEvent, {
					...validCredentials,
					matomoUrl: 'https://localhost',
				}),
			).rejects.toThrow('private or internal');

			await expect(
				provider.sendEvent(baseScanEvent, {
					...validCredentials,
					matomoUrl: 'https://192.168.1.1',
				}),
			).rejects.toThrow('private or internal');

			await expect(
				provider.sendEvent(baseScanEvent, {
					...validCredentials,
					matomoUrl: 'https://169.254.169.254',
				}),
			).rejects.toThrow('private or internal');
		});

		it('should use GET method', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await provider.sendEvent(baseScanEvent, validCredentials);

			const options = mockFetch.mock.calls[0][1];
			expect(options.method).toBe('GET');
		});

		it('should throw when Matomo returns non-OK status', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

			await expect(provider.sendEvent(baseScanEvent, validCredentials)).rejects.toThrow(
				'Matomo request failed with status 500',
			);
		});
	});

	describe('validateCredentials', () => {
		it('should return valid with credentialsVerified: true for valid credentials', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ idsite: '5' }),
			});

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: true, credentialsVerified: true });

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('SitesManager.getSiteFromId');
			expect(url).toContain('idSite=5');
		});

		it('should return valid: false with credentialsVerified: true when API returns error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ result: 'error', message: 'Invalid site ID' }),
			});

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: true });
		});

		it('should return valid: false with credentialsVerified: true when request fails', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: true });
		});

		it('should return valid: false with credentialsVerified: true when fetch throws', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await provider.validateCredentials(validCredentials);

			expect(result).toEqual({ valid: false, credentialsVerified: true });
		});

		it('should include auth token in validation request when provided', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ idsite: '5' }),
			});

			await provider.validateCredentials(credentialsWithAuth);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('token_auth=abc123tokenxyz');
		});
	});
});
