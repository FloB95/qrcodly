import { inject, singleton } from 'tsyringe';
import { Logger } from '@/core/logging';
import { env } from '@/core/config/env';
import QueryString from 'qs';
import { TAnalyticsMetric, TAnalyticsResponseDto, TTimeSeries } from '@shared/schemas';
import { BROWSERS, DEVICES } from '../config/constants';

@singleton()
export class UmamiAnalyticsService {
	private umamiHost: string;
	private umamiUsername: string;
	private umamiPassword: string;
	private umamiAuthToken: string;
	private umamiWebsiteId: string;
	private logger: Logger;

	constructor(@inject(Logger) logger: Logger) {
		this.umamiHost = env.UMAMI_HOST;
		this.umamiUsername = env.UMAMI_USERNAME;
		this.umamiPassword = env.UMAMI_PASSWORD;
		this.umamiWebsiteId = env.UMAMI_WEBSITE;

		this.logger = logger;
	}

	private async fetchUmamiAuthToken(): Promise<string> {
		const url = `${this.umamiHost}/api/auth/login`;
		const body = {
			username: this.umamiUsername,
			password: this.umamiPassword,
		};

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorBody = await response.text();
				this.logger.error(`Umami API Error ${response.status}: ${errorBody}`, {
					status: response.status,
					body: errorBody,
				});
				throw new Error(`Failed to fetch auth token from Umami: ${response.status} - ${errorBody}`);
			}

			const data = (await response.json()) as unknown as { token: string };
			this.umamiAuthToken = data.token;
			return data.token;
		} catch (error) {
			this.logger.error('Error fetching auth token from Umami API', { error });
			throw error;
		}
	}

	private async fetchUmamiData(endpoint: string, queryObject: object): Promise<any> {
		const token = this.umamiAuthToken || (await this.fetchUmamiAuthToken());

		const queryString = QueryString.stringify(queryObject);
		const url = `${this.umamiHost}/api/${endpoint}?${queryString}`;

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const errorBody = await response.text();
				this.logger.error(`Umami API Error ${response.status}: ${errorBody}`, {
					status: response.status,
					body: errorBody,
				});
				throw new Error(`Failed to fetch data from Umami: ${response.status} - ${errorBody}`);
			}

			return response.json();
		} catch (error) {
			this.logger.error('Error fetching data from Umami API', { error });
			throw error;
		}
	}

	private mapMetrics(metrics: { x: string; y: number }[]): TAnalyticsMetric[] {
		metrics = metrics.filter((metric) => metric.x !== null && metric.x !== undefined);

		return metrics.map((metric) => ({
			label: metric.x,
			count: metric.y,
		}));
	}

	private mapSessionsAndPageviews({
		pageviews,
		sessions,
	}: {
		pageviews: { x: string; y: number }[];
		sessions: { x: string; y: number }[];
	}): {
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

	public async getViewsForEndpoint(url: string): Promise<number> {
		const now = Date.now();
		const defaultParams = {
			startAt: new Date('2023-04-20T00:00:00Z').getTime(), // old start date to get all data
			endAt: now,
			unit: 'day',
			path: url,
			compare: 'false',
			timezone: 'Europe/Berlin',
		};
		interface WebsiteStats {
			pageviews: number;
			visitors: number;
			visits: number;
			bounces: number;
			totaltime: number;
		}

		const websiteStats = (await this.fetchUmamiData(
			`websites/${this.umamiWebsiteId}/stats`,
			defaultParams,
		)) as WebsiteStats;

		return websiteStats?.pageviews ?? 0;
	}

	public async getAnalyticsForEndpoint(url: string): Promise<TAnalyticsResponseDto> {
		const now = Date.now();
		const defaultParams = {
			startAt: new Date('2025-01-01T00:00:00Z').getTime(), // old start date to get all data
			endAt: now,
			unit: 'day',
			path: url,
			timezone: 'Europe/Berlin',
		};

		const websiteStats = await this.fetchUmamiData(`websites/${this.umamiWebsiteId}/stats`, {
			...defaultParams,
			compare: 'false',
		});

		const viewsAndSessions = this.mapSessionsAndPageviews(
			await this.fetchUmamiData(`websites/${this.umamiWebsiteId}/pageviews`, {
				...defaultParams,
				startAt: '1746709200000',
				unit: 'hour',
			}),
		);

		const browserMetrics = this.mapMetrics(
			await this.fetchUmamiData(`websites/${this.umamiWebsiteId}/metrics`, {
				...defaultParams,
				type: 'browser',
			}),
		).map((metric) => ({
			...metric,
			label: BROWSERS[metric.label as keyof typeof BROWSERS] || metric.label,
		}));

		const osMetrics = this.mapMetrics(
			await this.fetchUmamiData(`websites/${this.umamiWebsiteId}/metrics`, {
				...defaultParams,
				type: 'os',
			}),
		);

		const deviceMetrics = this.mapMetrics(
			await this.fetchUmamiData(`websites/${this.umamiWebsiteId}/metrics`, {
				...defaultParams,
				type: 'device',
			}),
		).map((metric) => ({
			...metric,
			label: DEVICES[metric.label as keyof typeof DEVICES] || metric.label,
		}));

		const countryMetrics = this.mapMetrics(
			await this.fetchUmamiData(`websites/${this.umamiWebsiteId}/metrics`, {
				...defaultParams,
				type: 'country',
			}),
		);

		return {
			shortUrlStats: websiteStats,
			viewsAndSessions,
			browserMetrics,
			osMetrics,
			deviceMetrics,
			countryMetrics,
		};
	}
}
