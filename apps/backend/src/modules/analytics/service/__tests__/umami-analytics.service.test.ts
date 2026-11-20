import { mock, type MockProxy } from 'jest-mock-extended';
import {
	type IUmamiDataPoint,
	type IUmamiPageviews,
	type IUmamiWebsiteStats,
	type TUmamiMetricType,
	type UmamiClient,
} from '@/libs/umami';
import { UmamiAnalyticsService } from '../umami-analytics.service';

const NOW = Date.parse('2026-06-15T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const stats = (pageviews = 100): IUmamiWebsiteStats => ({
	pageviews,
	visitors: 50,
	visits: 75,
	bounces: 10,
	totaltime: 5000,
});

describe('UmamiAnalyticsService', () => {
	let client: MockProxy<UmamiClient>;
	let service: UmamiAnalyticsService;

	beforeEach(() => {
		client = mock<UmamiClient>();
		service = new UmamiAnalyticsService(client);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('sendEvent', () => {
		const payload = {
			url: 'https://qrco.ly/u/abc12',
			userAgent: 'Mozilla/5.0',
			hostname: 'qrco.ly',
			language: 'en-GB',
			referrer: '',
			deviceType: 'mobile',
			ip: '203.0.113.7',
		};

		/** The event payload handed to the Umami client */
		const sentEvent = (): Record<string, unknown> =>
			client.sendEvent.mock.calls[0][0] as unknown as Record<string, unknown>;

		beforeEach(() => {
			client.sendEvent.mockResolvedValue('accepted');
		});

		it('hands the scan to Umami with the scanner IP so Umami geolocates the visitor', async () => {
			await service.sendEvent(payload);

			expect(client.sendEvent).toHaveBeenCalledTimes(1);
			expect(client.sendEvent).toHaveBeenCalledWith({
				url: payload.url,
				hostname: payload.hostname,
				language: payload.language,
				referrer: payload.referrer,
				userAgent: payload.userAgent,
				device: 'mobile',
				ip: payload.ip,
			});
		});

		it('forwards a resolved device type as the device override', async () => {
			await service.sendEvent(payload);

			expect(sentEvent()).toMatchObject({ device: 'mobile' });
		});

		// Umami 3 reads payload.device with `??`, so '' overrides its own detection instead of
		// falling through — that is what blanked every desktop scan. Leaving it unset (the client
		// then drops the key) restores it.
		it('omits the device override entirely when the device type is empty', async () => {
			await service.sendEvent({ ...payload, deviceType: '' });

			expect(sentEvent().device).toBeUndefined();
		});

		// Our ua-parser browser names ('Mobile Chrome') do not match the detect-browser keys
		// ('crios') that Umami stores and BROWSERS maps for display.
		it('never overrides browser, os or screen so Umami keeps deriving them', async () => {
			await service.sendEvent(payload);

			const sent = sentEvent();
			expect(sent).not.toHaveProperty('browser');
			expect(sent).not.toHaveProperty('os');
			expect(sent).not.toHaveProperty('screen');
			// The user agent they are derived from still has to reach Umami.
			expect(sent).toMatchObject({ userAgent: payload.userAgent });
		});

		it.each(['accepted', 'discarded', 'rejected', 'error'] as const)(
			'reports the %s outcome of the client',
			async (outcome) => {
				client.sendEvent.mockResolvedValue(outcome);

				await expect(service.sendEvent(payload)).resolves.toBe(outcome);
			},
		);
	});

	describe('getViewsForEndpoint', () => {
		it('asks for the stats of the path since 2023-04-20, per day, in Berlin time', async () => {
			jest.spyOn(Date, 'now').mockReturnValue(NOW);
			client.getWebsiteStats.mockResolvedValue(stats());

			await service.getViewsForEndpoint('/custom-path');

			expect(client.getWebsiteStats).toHaveBeenCalledTimes(1);
			const [query] = client.getWebsiteStats.mock.calls[0];
			// Umami 3.1+ rejects compare values other than 'prev'|'yoy' — must not be sent.
			expect(query).toStrictEqual({
				startAt: Date.parse('2023-04-20T00:00:00Z'),
				endAt: NOW,
				unit: 'day',
				path: '/custom-path',
				timezone: 'Europe/Berlin',
			});
			// The client sends the query in this order
			expect(Object.keys(query)).toEqual(['startAt', 'endAt', 'unit', 'path', 'timezone']);
		});

		it('should return pageviews count from response', async () => {
			client.getWebsiteStats.mockResolvedValue(stats(250));

			await expect(service.getViewsForEndpoint('/test-url')).resolves.toBe(250);
		});

		it.each([
			['undefined', {}],
			['null', { pageviews: null }],
		])('should return 0 when pageviews is %s', async (_, response) => {
			client.getWebsiteStats.mockResolvedValue(response as unknown as IUmamiWebsiteStats);

			await expect(service.getViewsForEndpoint('/test-url')).resolves.toBe(0);
		});

		it('propagates a failing Umami request', async () => {
			client.getWebsiteStats.mockRejectedValue(
				new Error('Failed to fetch auth token from Umami: 401 - Unauthorized'),
			);

			await expect(service.getViewsForEndpoint('/test-url')).rejects.toThrow(
				'Failed to fetch auth token from Umami',
			);
		});
	});

	describe('getAnalyticsForEndpoint', () => {
		const mockUmami = ({
			websiteStats = stats(),
			pageviews = { pageviews: [], sessions: [] },
			metrics = {},
		}: {
			websiteStats?: IUmamiWebsiteStats;
			pageviews?: IUmamiPageviews;
			metrics?: Partial<Record<TUmamiMetricType, unknown[]>>;
		}) => {
			client.getWebsiteStats.mockResolvedValue(websiteStats);
			client.getWebsitePageviews.mockResolvedValue(pageviews);
			client.getWebsiteMetrics.mockImplementation(
				async ({ type }) => (metrics[type] ?? []) as IUmamiDataPoint[],
			);
		};

		const requestedMetricTypes = () =>
			client.getWebsiteMetrics.mock.calls.map(([query]) => query.type);

		const hoursAgoLabel = (hours: number) => {
			const date = new Date(Date.now() - hours * 60 * 60 * 1000);
			const pad = (value: number) => String(value).padStart(2, '0');
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:00:00`;
		};

		it('asks for the stats, 30 days of hourly pageviews and every breakdown, in that order', async () => {
			jest.spyOn(Date, 'now').mockReturnValue(NOW);
			mockUmami({});

			await service.getAnalyticsForEndpoint('/test-url', { includeDetails: true });

			// Same start as getViewsForEndpoint, so the analytics page matches the views counter
			const baseQuery = {
				startAt: Date.parse('2023-04-20T00:00:00Z'),
				endAt: NOW,
				unit: 'day',
				path: '/test-url',
				timezone: 'Europe/Berlin',
			};
			const keyOrder = ['startAt', 'endAt', 'unit', 'path', 'timezone'];

			const [statsQuery] = client.getWebsiteStats.mock.calls[0];
			expect(statsQuery).toStrictEqual(baseQuery);
			expect(Object.keys(statsQuery)).toEqual(keyOrder);

			const [pageviewsQuery] = client.getWebsitePageviews.mock.calls[0];
			expect(pageviewsQuery).toStrictEqual({
				...baseQuery,
				startAt: NOW - 30 * DAY_MS,
				unit: 'hour',
			});
			expect(Object.keys(pageviewsQuery)).toEqual(keyOrder);

			expect(requestedMetricTypes()).toEqual(['browser', 'os', 'device', 'country']);
			client.getWebsiteMetrics.mock.calls.forEach(([query]) => {
				expect(query).toStrictEqual({ ...baseQuery, type: query.type });
				expect(Object.keys(query)).toEqual([...keyOrder, 'type']);
			});

			const [statsOrder] = client.getWebsiteStats.mock.invocationCallOrder;
			const [pageviewsOrder] = client.getWebsitePageviews.mock.invocationCallOrder;
			const [firstMetricOrder] = client.getWebsiteMetrics.mock.invocationCallOrder;
			expect(statsOrder).toBeLessThan(pageviewsOrder);
			expect(pageviewsOrder).toBeLessThan(firstMetricOrder);
		});

		it('should fetch multiple metrics (stats, pageviews, browsers, os, device, country)', async () => {
			mockUmami({
				pageviews: {
					pageviews: [{ x: '2025-01-01', y: 10 }],
					sessions: [{ x: '2025-01-01', y: 5 }],
				},
				metrics: {
					browser: [{ x: 'chrome', y: 50 }],
					os: [{ x: 'windows', y: 40 }],
					device: [{ x: 'desktop', y: 60 }],
					country: [{ x: 'US', y: 70 }],
				},
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: true,
			});

			expect(analytics.shortUrlStats).toBeDefined();
			expect(analytics.viewsAndSessions).toBeDefined();
			expect(analytics.browserMetrics).toBeDefined();
			expect(analytics.osMetrics).toBeDefined();
			expect(analytics.deviceMetrics).toBeDefined();
			expect(analytics.countryMetrics).toBeDefined();
		});

		it('should map metrics correctly with mapMetrics()', async () => {
			mockUmami({
				metrics: {
					browser: [
						{ x: 'chrome', y: 50 },
						{ x: 'firefox', y: 30 },
					],
					os: [{ x: 'windows', y: 40 }],
					device: [{ x: 'desktop', y: 60 }],
					country: [{ x: 'US', y: 70 }],
				},
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: true,
			});

			expect(analytics.browserMetrics).toHaveLength(2);
			expect(analytics.browserMetrics![0]).toHaveProperty('label');
			expect(analytics.browserMetrics![0]).toHaveProperty('count');
		});

		it('should map sessions and pageviews with mapSessionsAndPageviews()', async () => {
			mockUmami({
				pageviews: {
					pageviews: [
						{ x: '2025-01-01', y: 10 },
						{ x: '2025-01-02', y: 15 },
					],
					sessions: [
						{ x: '2025-01-01', y: 5 },
						{ x: '2025-01-02', y: 8 },
					],
				},
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: true,
			});

			expect(analytics.viewsAndSessions!.pageviews).toHaveLength(2);
			expect(analytics.viewsAndSessions!.sessions).toHaveLength(2);
			expect(analytics.viewsAndSessions!.pageviews[0]).toEqual({
				date: '2025-01-01',
				value: 10,
			});
		});

		it('should filter out null/undefined/empty metric values', async () => {
			mockUmami({
				metrics: {
					browser: [
						{ x: 'chrome', y: 50 },
						{ x: null, y: 30 },
						{ x: undefined, y: 20 },
						{ x: '', y: 10 },
					],
				},
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: true,
			});

			// Should only have the valid metric
			expect(analytics.browserMetrics).toHaveLength(1);
			expect(analytics.browserMetrics![0].label).toBe('Chrome');
		});

		it('should not fetch browser or os metrics without details', async () => {
			mockUmami({
				metrics: {
					device: [{ x: 'mobile', y: 60 }],
					country: [{ x: 'DE', y: 70 }],
				},
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: false,
			});

			expect(requestedMetricTypes()).toEqual(['device', 'country']);

			expect(analytics.detailsLocked).toBe(true);
			expect(analytics.viewsAndSessions).toBeNull();
			expect(analytics.browserMetrics).toBeNull();
			expect(analytics.osMetrics).toBeNull();
			expect(analytics.deviceMetrics).toBeNull();
			expect(analytics.countryMetrics).toBeNull();
			expect(analytics.shortUrlStats.pageviews).toBe(100);
			expect(analytics.summary.topCountry).toEqual({ label: 'DE', share: 100 });
			expect(analytics.summary.topDevice).toEqual({ label: 'Mobile', share: 100 });
		});

		it('should return the details alongside the summary when included', async () => {
			mockUmami({
				metrics: {
					browser: [{ x: 'chrome', y: 50 }],
					os: [{ x: 'windows', y: 40 }],
					device: [{ x: 'mobile', y: 60 }],
					country: [{ x: 'DE', y: 70 }],
				},
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: true,
			});

			expect(analytics.detailsLocked).toBe(false);
			expect(analytics.browserMetrics).toEqual([{ label: 'Chrome', count: 50 }]);
			expect(analytics.osMetrics).toEqual([{ label: 'windows', count: 40 }]);
			expect(analytics.deviceMetrics).toEqual([{ label: 'Mobile', count: 60 }]);
			expect(analytics.countryMetrics).toEqual([{ label: 'DE', count: 70 }]);
			expect(analytics.summary.topCountry).toEqual({ label: 'DE', share: 100 });
		});

		it('should sum only the hourly buckets of the last 7 days', async () => {
			mockUmami({
				pageviews: {
					pageviews: [
						{ x: hoursAgoLabel(10 * 24), y: 40 },
						{ x: hoursAgoLabel(3 * 24), y: 5 },
						{ x: hoursAgoLabel(2), y: 7 },
					],
					sessions: [
						{ x: hoursAgoLabel(10 * 24), y: 20 },
						{ x: hoursAgoLabel(3 * 24), y: 2 },
						{ x: hoursAgoLabel(2), y: 3 },
					],
				},
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: false,
			});

			expect(analytics.summary.pageviewsLast7Days).toBe(12);
			expect(analytics.summary.visitorsLast7Days).toBe(5);
		});

		it('should pick the largest country and device with their rounded share', async () => {
			mockUmami({
				websiteStats: { pageviews: 3, visitors: 3, visits: 3, bounces: 0, totaltime: 0 },
				metrics: {
					device: [
						{ x: 'desktop', y: 1 },
						{ x: 'mobile', y: 2 },
					],
					country: [
						{ x: 'AT', y: 1 },
						{ x: 'DE', y: 2 },
					],
				},
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: false,
			});

			expect(analytics.summary.topCountry).toEqual({ label: 'DE', share: 67 });
			expect(analytics.summary.topDevice).toEqual({ label: 'Mobile', share: 67 });
		});

		it('should report no top country or device when nothing was tracked', async () => {
			mockUmami({
				websiteStats: { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 },
			});

			const analytics = await service.getAnalyticsForEndpoint('/test-url', {
				includeDetails: false,
			});

			expect(analytics.summary).toEqual({
				pageviewsLast7Days: 0,
				visitorsLast7Days: 0,
				topCountry: null,
				topDevice: null,
			});
		});

		it('should throw when a data request fails', async () => {
			mockUmami({});
			client.getWebsiteMetrics.mockRejectedValue(
				new Error('Failed to fetch data from Umami: 404 - Not Found'),
			);

			await expect(
				service.getAnalyticsForEndpoint('/test-url', { includeDetails: true }),
			).rejects.toThrow('Failed to fetch data from Umami');
		});
	});
});
