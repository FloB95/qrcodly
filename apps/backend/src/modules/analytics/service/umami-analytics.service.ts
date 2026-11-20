import { inject, singleton } from 'tsyringe';
import {
	TAnalyticsMetric,
	TAnalyticsResponseDto,
	TAnalyticsTopEntry,
	TTimeSeries,
} from '@shared/schemas';
import {
	type IUmamiDataPoint,
	type IUmamiPageviews,
	type IUmamiWebsiteQuery,
	type TUmamiSendOutcome,
	UmamiClient,
} from '@/libs/umami';
import { BROWSERS, DEVICES } from '../config/constants';

/**
 * Umami labels hourly buckets in Europe/Berlin time without an offset. The container runs with
 * TZ=Europe/Berlin, so `new Date(label)` reads them the way the dashboard always has.
 */
function sumSince(series: TTimeSeries[], cutoff: Date): number {
	return series
		.filter((item) => new Date(item.date) >= cutoff)
		.reduce((acc, item) => acc + item.value, 0);
}

function findTopEntry(metrics: TAnalyticsMetric[]): TAnalyticsTopEntry | null {
	const [top] = [...metrics].sort((a, b) => b.count - a.count);
	if (!top) return null;

	const total = metrics.reduce((sum, item) => sum + item.count, 0);
	return { label: top.label, share: total > 0 ? Math.round((top.count / total) * 100) : 0 };
}

@singleton()
export class UmamiAnalyticsService {
	constructor(@inject(UmamiClient) private readonly umamiClient: UmamiClient) {}

	private mapMetrics(metrics: IUmamiDataPoint[]): TAnalyticsMetric[] {
		metrics = metrics.filter(
			(metric) => metric.x !== null && metric.x !== undefined && metric.x !== '',
		);

		return metrics.map((metric) => ({
			label: metric.x,
			count: metric.y,
		}));
	}

	private mapSessionsAndPageviews({ pageviews, sessions }: IUmamiPageviews): {
		pageviews: TTimeSeries[];
		sessions: TTimeSeries[];
	} {
		const mappedPageviews = pageviews
			.filter((metric) => metric.x !== null && metric.x !== undefined)
			.map((metric) => ({
				date: metric.x,
				value: metric.y,
			}));

		const mappedSessions = sessions
			.filter((metric) => metric.x !== null && metric.x !== undefined)
			.map((metric) => ({
				date: metric.x,
				value: metric.y,
			}));

		return {
			pageviews: mappedPageviews,
			sessions: mappedSessions,
		};
	}

	/**
	 * Forwards a scan to Umami and reports what Umami did with it (see UmamiClient.sendEvent).
	 *
	 * Only `device` is overridden here. Umami 3 honours `payload.device`/`payload.browser` via `??`,
	 * which does not fall through on '' — so an empty override silently blanks the dimension rather
	 * than letting Umami derive it. `browser` is deliberately left to Umami: it names browsers with
	 * detect-browser's lowercase keys ('chrome', 'crios', …), which is what BROWSERS maps for display
	 * and what every pre-existing row in the database uses.
	 */
	public async sendEvent(payload: {
		url: string;
		userAgent: string;
		hostname: string;
		language: string;
		referrer: string;
		deviceType: string;
		ip: string;
	}): Promise<TUmamiSendOutcome> {
		return this.umamiClient.sendEvent({
			url: payload.url,
			hostname: payload.hostname,
			language: payload.language,
			referrer: payload.referrer,
			// Sent in the body as well as in the header: browser and os are derived from it,
			// and an outbound User-Agent header is the kind of thing a proxy rewrites.
			userAgent: payload.userAgent,
			// Omitted when empty so Umami falls back to its own user-agent detection.
			device: payload.deviceType || undefined,
			ip: payload.ip,
		});
	}

	public async getViewsForEndpoint(url: string): Promise<number> {
		const now = Date.now();
		const defaultParams: IUmamiWebsiteQuery = {
			startAt: new Date('2023-04-20T00:00:00Z').getTime(), // old start date to get all data
			endAt: now,
			unit: 'day',
			path: url,
			timezone: 'Europe/Berlin',
		};

		const websiteStats = await this.umamiClient.getWebsiteStats(defaultParams);

		return websiteStats?.pageviews ?? 0;
	}

	/**
	 * Without `includeDetails` only the headline figures leave this service: the breakdowns and
	 * the time series they are derived from are Pro-only and must not reach the client at all.
	 */
	public async getAnalyticsForEndpoint(
		url: string,
		{ includeDetails }: { includeDetails: boolean },
	): Promise<TAnalyticsResponseDto> {
		const now = Date.now();
		const defaultParams: IUmamiWebsiteQuery = {
			startAt: new Date('2025-01-01T00:00:00Z').getTime(), // old start date to get all data
			endAt: now,
			unit: 'day',
			path: url,
			timezone: 'Europe/Berlin',
		};

		const websiteStats = await this.umamiClient.getWebsiteStats(defaultParams);

		const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
		const viewsAndSessions = this.mapSessionsAndPageviews(
			await this.umamiClient.getWebsitePageviews({
				...defaultParams,
				startAt: thirtyDaysAgo,
				unit: 'hour',
			}),
		);

		const browserMetrics = includeDetails
			? this.mapMetrics(
					await this.umamiClient.getWebsiteMetrics({
						...defaultParams,
						type: 'browser',
					}),
				).map((metric) => ({
					...metric,
					label: BROWSERS[metric.label as keyof typeof BROWSERS] || metric.label,
				}))
			: null;

		const osMetrics = includeDetails
			? this.mapMetrics(
					await this.umamiClient.getWebsiteMetrics({
						...defaultParams,
						type: 'os',
					}),
				)
			: null;

		const deviceMetrics = this.mapMetrics(
			await this.umamiClient.getWebsiteMetrics({
				...defaultParams,
				type: 'device',
			}),
		).map((metric) => ({
			...metric,
			label: DEVICES[metric.label as keyof typeof DEVICES] || metric.label,
		}));

		const countryMetrics = this.mapMetrics(
			await this.umamiClient.getWebsiteMetrics({
				...defaultParams,
				type: 'country',
			}),
		);

		const oneWeekAgo = new Date(now);
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

		return {
			shortUrlStats: websiteStats,
			summary: {
				pageviewsLast7Days: sumSince(viewsAndSessions.pageviews, oneWeekAgo),
				visitorsLast7Days: sumSince(viewsAndSessions.sessions, oneWeekAgo),
				topCountry: findTopEntry(countryMetrics),
				topDevice: findTopEntry(deviceMetrics),
			},
			detailsLocked: !includeDetails,
			viewsAndSessions: includeDetails ? viewsAndSessions : null,
			browserMetrics,
			osMetrics,
			deviceMetrics: includeDetails ? deviceMetrics : null,
			countryMetrics: includeDetails ? countryMetrics : null,
		};
	}
}
