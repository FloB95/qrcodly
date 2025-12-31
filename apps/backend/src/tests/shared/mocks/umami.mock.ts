/* eslint-disable @typescript-eslint/require-await */
import type { TAnalyticsResponseDto } from '@shared/schemas';

/**
 * Creates a mock Umami authentication response.
 */
export const createMockUmamiResponse = () => ({
	token: 'mock-jwt-token-' + Math.random().toString(36).substring(7),
});

/**
 * Creates mock analytics data for testing.
 */
export const createMockAnalyticsData = (): TAnalyticsResponseDto => ({
	shortUrlStats: {
		pageviews: 100,
		visitors: 50,
		visits: 75,
		bounces: 10,
		totaltime: 5000,
	},
	viewsAndSessions: {
		pageviews: [
			{ date: '2025-01-01', value: 10 },
			{ date: '2025-01-02', value: 15 },
		],
		sessions: [
			{ date: '2025-01-01', value: 5 },
			{ date: '2025-01-02', value: 8 },
		],
	},
	browserMetrics: [
		{ label: 'Chrome', count: 50 },
		{ label: 'Firefox', count: 30 },
		{ label: 'Safari', count: 20 },
	],
	osMetrics: [
		{ label: 'Windows', count: 40 },
		{ label: 'macOS', count: 35 },
		{ label: 'Linux', count: 25 },
	],
	deviceMetrics: [
		{ label: 'Desktop', count: 60 },
		{ label: 'Mobile', count: 30 },
		{ label: 'Tablet', count: 10 },
	],
	countryMetrics: [
		{ label: 'US', count: 70 },
		{ label: 'UK', count: 20 },
		{ label: 'DE', count: 10 },
	],
});

/**
 * Mocks the global fetch function for Umami API authentication.
 */
export const mockFetchUmamiAuth = (success = true) => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: success,
		status: success ? 200 : 401,
		json: async () => (success ? createMockUmamiResponse() : { error: 'Unauthorized' }),
	});
};

/**
 * Mocks the global fetch function for Umami analytics data.
 */
export const mockFetchUmamiAnalytics = (data: Partial<TAnalyticsResponseDto> = {}) => {
	const mockData = { ...createMockAnalyticsData(), ...data };
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => mockData,
	});
};

/**
 * Resets all fetch mocks.
 */
export const resetFetchMocks = () => {
	if (jest.isMockFunction(global.fetch)) {
		(global.fetch as jest.Mock).mockClear();
	}
};
