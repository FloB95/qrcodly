import 'reflect-metadata';
import { MatomoApiError, MatomoClient, type IMatomoTrackRequest } from '..';

describe('MatomoClient', () => {
	let client: MatomoClient;
	let mockFetch: jest.Mock;
	const originalFetch = global.fetch;

	const matomoUrl = 'https://matomo.example.com';

	const trackRequest: IMatomoTrackRequest = {
		siteId: '5',
		actionName: 'QR Code Scan',
		url: 'https://example.com/landing',
		referrer: 'https://google.com',
		language: 'de-DE',
		customVariables: {
			'1': ['Device Type', 'desktop'],
			'2': ['Browser', 'Chrome'],
		},
	};

	const auth = { token: 'abc123tokenxyz', clientIp: '203.0.113.0' };

	beforeEach(() => {
		client = new MatomoClient();
		mockFetch = jest.fn();
		global.fetch = mockFetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	describe('track', () => {
		it('should send tracking request to matomo.php', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.track(matomoUrl, trackRequest);

			expect(mockFetch).toHaveBeenCalledTimes(1);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('https://matomo.example.com/matomo.php');
			expect(url).toContain('idsite=5');
			expect(url).toContain('rec=1');
		});

		it('should include the request data as URL params', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.track(matomoUrl, trackRequest);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain(encodeURIComponent('https://example.com/landing'));
			expect(url).toContain('action_name=QR+Code+Scan');
			expect(url).toContain('lang=de-DE');
		});

		it('should send the exact URL with params in a fixed order', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.track('https://matomo.example.com/analytics', { ...trackRequest, auth });

			expect(mockFetch.mock.calls[0][0]).toBe(
				'https://matomo.example.com/analytics/matomo.php?idsite=5&rec=1&apiv=1&bots=1' +
					'&action_name=QR+Code+Scan&url=https%3A%2F%2Fexample.com%2Flanding' +
					'&urlref=https%3A%2F%2Fgoogle.com&lang=de-DE&send_image=0' +
					'&_cvar=%7B%221%22%3A%5B%22Device+Type%22%2C%22desktop%22%5D%2C%222%22%3A' +
					'%5B%22Browser%22%2C%22Chrome%22%5D%7D&token_auth=abc123tokenxyz&cip=203.0.113.0',
			);
		});

		it('should include auth token and cip when auth is provided', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.track(matomoUrl, { ...trackRequest, auth });

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('token_auth=abc123tokenxyz');
			expect(new URL(url).searchParams.get('cip')).toBe('203.0.113.0');
		});

		it('should not include auth token or cip when not provided', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.track(matomoUrl, trackRequest);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).not.toContain('token_auth');
			expect(url).not.toContain('cip=');
		});

		it('should pass custom variables as _cvar JSON', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.track(matomoUrl, trackRequest);

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

			await client.track('https://matomo.example.com/', trackRequest);

			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toContain('matomo.example.com/matomo.php');
		});

		it('should reject URLs pointing to private/internal addresses', async () => {
			await expect(client.track('https://localhost', trackRequest)).rejects.toThrow(
				'private or internal',
			);
			await expect(client.track('https://192.168.1.1', trackRequest)).rejects.toThrow(
				'private or internal',
			);
			await expect(client.track('https://169.254.169.254', trackRequest)).rejects.toThrow(
				'private or internal',
			);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should use GET method with a 5 second timeout', async () => {
			const timeout = jest.spyOn(AbortSignal, 'timeout');
			mockFetch.mockResolvedValueOnce({ ok: true });

			await client.track(matomoUrl, trackRequest);

			const options = mockFetch.mock.calls[0][1];
			expect(options.method).toBe('GET');
			expect(timeout).toHaveBeenCalledWith(5000);
		});

		it('should throw when Matomo returns non-OK status', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

			const error = await client.track(matomoUrl, trackRequest).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(MatomoApiError);
			expect((error as MatomoApiError).status).toBe(500);
			expect((error as MatomoApiError).message).toBe('Matomo request failed with status 500');
		});
	});

	describe('checkSite', () => {
		it('should reject URLs pointing to private/internal addresses without calling Matomo', async () => {
			await expect(client.checkSite('https://localhost', '5', 'abc123tokenxyz')).rejects.toThrow(
				'private or internal',
			);
			await expect(client.checkSite('http://matomo.example.com', '5')).rejects.toThrow(
				'Matomo URL must use HTTPS',
			);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		describe('with auth token (Reporting API)', () => {
			it('should accept a site the Reporting API returns', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ idsite: '5' }),
				});

				const result = await client.checkSite(matomoUrl, '5', 'abc123tokenxyz');

				expect(result).toBe('accepted');

				const url = mockFetch.mock.calls[0][0] as string;
				expect(url).toContain('SitesManager.getSiteFromId');
				expect(url).toContain('idSite=5');
				expect(url).toContain('token_auth=abc123tokenxyz');
			});

			it('should send the exact Reporting API URL', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ idsite: '5' }),
				});

				await client.checkSite('https://matomo.example.com/analytics', '5', 'abc123tokenxyz');

				expect(mockFetch.mock.calls[0][0]).toBe(
					'https://matomo.example.com/analytics/index.php?module=API' +
						'&method=SitesManager.getSiteFromId&idSite=5&format=JSON&token_auth=abc123tokenxyz',
				);
				expect(mockFetch.mock.calls[0][1].method).toBe('GET');
			});

			it('should reject when the API returns an error', async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ result: 'error', message: 'Invalid site ID' }),
				});

				const result = await client.checkSite(matomoUrl, '5', 'abc123tokenxyz');

				expect(result).toBe('rejected');
			});

			it('should reject when the Reporting API returns 401 (invalid token)', async () => {
				mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

				const result = await client.checkSite(matomoUrl, '5', 'abc123tokenxyz');

				expect(result).toBe('rejected');
				expect(mockFetch).toHaveBeenCalledTimes(1);
			});

			it('should fall back to tracking endpoint on network error', async () => {
				// Reporting API network error
				mockFetch.mockRejectedValueOnce(new Error('Network error'));
				// Tracking endpoint returns 200
				mockFetch.mockResolvedValueOnce({ ok: true });

				const result = await client.checkSite(matomoUrl, '5', 'abc123tokenxyz');

				expect(result).toBe('accepted');
				expect(mockFetch).toHaveBeenCalledTimes(2);
			});
		});

		describe('without auth token (tracking endpoint fallback)', () => {
			it('should validate via tracking endpoint and accept', async () => {
				mockFetch.mockResolvedValueOnce({ ok: true });

				const result = await client.checkSite(matomoUrl, '5');

				expect(result).toBe('accepted');

				const url = mockFetch.mock.calls[0][0] as string;
				expect(url).toContain('/matomo.php');
				expect(url).toContain('idsite=5');
			});

			it('should send the exact tracking endpoint URL', async () => {
				mockFetch.mockResolvedValueOnce({ ok: true });

				await client.checkSite('https://matomo.example.com/analytics', '5');

				expect(mockFetch.mock.calls[0][0]).toBe(
					'https://matomo.example.com/analytics/matomo.php?idsite=5&rec=1' +
						'&action_name=Connection+Test&url=https%3A%2F%2Fmatomo.example.com%2Fanalytics' +
						'&send_image=0',
				);
				expect(mockFetch.mock.calls[0][1].method).toBe('GET');
			});

			it('should reject when tracking endpoint returns 400', async () => {
				mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

				const result = await client.checkSite(matomoUrl, '5');

				expect(result).toBe('rejected');
			});

			it('should report unreachable when fetch throws', async () => {
				mockFetch.mockRejectedValueOnce(new Error('Network error'));

				const result = await client.checkSite(matomoUrl, '5');

				expect(result).toBe('unreachable');
			});
		});
	});
});
