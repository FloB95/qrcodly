import { UmamiAnalyticsService } from '../umami-analytics.service';
import type { Logger } from '@/core/logging';
import { mock } from 'jest-mock-extended';

// Mock environment variables
jest.mock('@/core/config/env', () => ({
	env: {
		UMAMI_HOST: 'https://umami.example.com',
		UMAMI_USERNAME: 'test_user',
		UMAMI_PASSWORD: 'test_password',
		UMAMI_WEBSITE: 'website_123',
	},
}));

describe('UmamiAnalyticsService', () => {
	let service: UmamiAnalyticsService;
	let mockLogger: jest.Mocked<Logger>;
	let mockFetch: jest.Mock;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		service = new UmamiAnalyticsService(mockLogger);
		mockFetch = jest.fn();
		global.fetch = mockFetch;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('fetchUmamiAuthToken', () => {
		it('should fetch auth token from Umami API on first request', async () => {
			const mockToken = 'mock_jwt_token';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ token: mockToken }),
			});
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ pageviews: 100 }),
			});

			await service.getViewsForEndpoint('/test-url');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://umami.example.com/api/auth/login',
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						username: 'test_user',
						password: 'test_password',
					}),
				}),
			);
		});

		it('should cache auth token for subsequent requests', async () => {
			const mockToken = 'mock_jwt_token';
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ token: mockToken }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ pageviews: 100 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ pageviews: 200 }),
				});

			await service.getViewsForEndpoint('/test-url-1');
			await service.getViewsForEndpoint('/test-url-2');

			// Auth should only be called once

			const authCalls = mockFetch.mock.calls.filter((call: any) =>
				String(call[0]).includes('/api/auth/login'),
			);
			expect(authCalls).toHaveLength(1);
		});

		it('should send username and password to /api/auth/login', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ pageviews: 100 }),
			});
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ token: 'mock_token' }),
			});

			await service.getViewsForEndpoint('/test-url');

			const authCall = mockFetch.mock.calls.find((call: any) =>
				String(call[0]).includes('/api/auth/login'),
			);
			expect(authCall).toBeDefined();

			const body = JSON.parse(authCall[1].body) as { username: string; password: string };
			expect(body.username).toBe('test_user');
			expect(body.password).toBe('test_password');
		});

		it('should handle auth failures with error logging', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: () => Promise.resolve('Unauthorized'),
			});

			await expect(service.getViewsForEndpoint('/test-url')).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith(
				'error.umamiApi.fetchToken',
				expect.objectContaining({
					error: expect.any(Error),
				}),
			);
		});
	});

	describe('getViewsForEndpoint', () => {
		beforeEach(() => {
			// Mock successful auth
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ token: 'mock_token' }),
			});
		});

		it('should fetch page views from /websites/{id}/stats endpoint', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					pageviews: 150,
					visitors: 75,
					visits: 100,
					bounces: 10,
					totaltime: 5000,
				}),
			});

			await service.getViewsForEndpoint('/test-url');

			const statsCall = mockFetch.mock.calls.find((call) => call[0].includes('/stats?'));
			expect(statsCall).toBeDefined();
			expect(statsCall![0]).toContain('websites/website_123/stats');
		});

		it('should return pageviews count from response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					pageviews: 250,
					visitors: 100,
				}),
			});

			const views = await service.getViewsForEndpoint('/test-url');

			expect(views).toBe(250);
		});

		it('should return 0 when pageviews is undefined', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({}),
			});

			const views = await service.getViewsForEndpoint('/test-url');

			expect(views).toBe(0);
		});

		it('should return 0 when pageviews is null', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ pageviews: null }),
			});

			const views = await service.getViewsForEndpoint('/test-url');

			expect(views).toBe(0);
		});

		it('should use correct query params (startAt, endAt, path, timezone)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ pageviews: 100 }),
			});

			await service.getViewsForEndpoint('/custom-path');

			const statsCall = mockFetch.mock.calls.find((call) => call[0].includes('/stats?'));
			expect(statsCall![0]).toContain('path=%2Fcustom-path');
			expect(statsCall![0]).toContain('timezone=Europe%2FBerlin');
			expect(statsCall![0]).toContain('unit=day');
		});
	});

	describe('getAnalyticsForEndpoint', () => {
		beforeEach(() => {
			// Mock successful auth
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ token: 'mock_token' }),
			});
		});

		it('should fetch multiple metrics (stats, pageviews, browsers, os, device, country)', async () => {
			// Mock all API calls
			const mockResponses = [
				{ pageviews: 100, visitors: 50, visits: 75, bounces: 10, totaltime: 5000 }, // stats
				{
					pageviews: [{ x: '2025-01-01', y: 10 }],
					sessions: [{ x: '2025-01-01', y: 5 }],
				}, // pageviews
				[{ x: 'chrome', y: 50 }], // browsers
				[{ x: 'windows', y: 40 }], // os
				[{ x: 'desktop', y: 60 }], // device
				[{ x: 'US', y: 70 }], // country
			];

			mockResponses.forEach((response) => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => response,
				});
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url');

			expect(analytics.shortUrlStats).toBeDefined();
			expect(analytics.viewsAndSessions).toBeDefined();
			expect(analytics.browserMetrics).toBeDefined();
			expect(analytics.osMetrics).toBeDefined();
			expect(analytics.deviceMetrics).toBeDefined();
			expect(analytics.countryMetrics).toBeDefined();
		});

		it('should map metrics correctly with mapMetrics()', async () => {
			const mockResponses = [
				{ pageviews: 100 },
				{ pageviews: [], sessions: [] },
				[
					{ x: 'chrome', y: 50 },
					{ x: 'firefox', y: 30 },
				],
				[{ x: 'windows', y: 40 }],
				[{ x: 'desktop', y: 60 }],
				[{ x: 'US', y: 70 }],
			];

			mockResponses.forEach((response) => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => response,
				});
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url');

			expect(analytics.browserMetrics).toHaveLength(2);
			expect(analytics.browserMetrics[0]).toHaveProperty('label');
			expect(analytics.browserMetrics[0]).toHaveProperty('count');
		});

		it('should map sessions and pageviews with mapSessionsAndPageviews()', async () => {
			const mockResponses = [
				{ pageviews: 100 },
				{
					pageviews: [
						{ x: '2025-01-01', y: 10 },
						{ x: '2025-01-02', y: 15 },
					],
					sessions: [
						{ x: '2025-01-01', y: 5 },
						{ x: '2025-01-02', y: 8 },
					],
				},
				[],
				[],
				[],
				[],
			];

			mockResponses.forEach((response) => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => response,
				});
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url');

			expect(analytics.viewsAndSessions.pageviews).toHaveLength(2);
			expect(analytics.viewsAndSessions.sessions).toHaveLength(2);
			expect(analytics.viewsAndSessions.pageviews[0]).toEqual({
				date: '2025-01-01',
				value: 10,
			});
		});

		it('should filter out null/undefined metric values', async () => {
			const mockResponses = [
				{ pageviews: 100 },
				{ pageviews: [], sessions: [] },
				[
					{ x: 'chrome', y: 50 },
					{ x: null, y: 30 },
					{ x: undefined, y: 20 },
				],
				[],
				[],
				[],
			];

			mockResponses.forEach((response) => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => response,
				});
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url');

			// Should only have the valid metric
			expect(analytics.browserMetrics).toHaveLength(1);
			expect(analytics.browserMetrics[0].label).toBe('Chrome');
		});

		it('should throw error when auth request fails', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: () => Promise.resolve('Unauthorized'),
			});

			await expect(service.getAnalyticsForEndpoint('/test-url')).rejects.toThrow();
		});

		it('should log errors with status code and body', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ token: 'mock_token' }),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					text: () => Promise.resolve('Internal Server Error'),
				});

			await expect(service.getAnalyticsForEndpoint('/test-url')).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith(
				'error.umamiApi.fetchData',
				expect.objectContaining({
					error: expect.any(Error),
				}),
			);
		});

		it('should throw error when data fetch fails (non-200)', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ token: 'mock_token' }),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					text: () => Promise.resolve('Not Found'),
				});

			await expect(service.getAnalyticsForEndpoint('/test-url')).rejects.toThrow(
				'Failed to fetch data from Umami',
			);
		});

		it('should handle network errors gracefully', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ token: 'mock_token' }),
				})
				.mockRejectedValueOnce(new Error('Network error'));

			await expect(service.getAnalyticsForEndpoint('/test-url')).rejects.toThrow('Network error');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'error.umamiApi.fetchData',
				expect.objectContaining({
					error: expect.any(Error),
				}),
			);
		});

		it('should include Authorization header with Bearer token', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ pageviews: 100 }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ pageviews: [], sessions: [] }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [],
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [],
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [],
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [],
				});

			await service.getAnalyticsForEndpoint('/test-url');

			// Check that all data fetch calls include Authorization header
			const dataFetchCalls = mockFetch.mock.calls.filter(
				(call) => !call[0].includes('/api/auth/login'),
			);
			dataFetchCalls.forEach((call) => {
				expect(call[1]?.headers?.Authorization).toBeDefined();
			});
		});

		it('should use correct Umami host from env', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ pageviews: 100 }),
			});

			await service.getViewsForEndpoint('/test-url');

			const statsCall = mockFetch.mock.calls.find((call) => call[0].includes('/stats'));
			expect(statsCall![0]).toContain('https://umami.example.com');
		});

		it('should use correct website ID from env', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ pageviews: 100 }),
			});

			await service.getViewsForEndpoint('/test-url');

			const statsCall = mockFetch.mock.calls.find((call) => call[0].includes('/stats'));
			expect(statsCall![0]).toContain('websites/website_123');
		});
	});
});
