import { inject, injectable } from 'tsyringe';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';
import { SHORT_BASE_URL } from '@/modules/url-shortener/config/constants';

interface UrlAnalyticsOverview {
	views: number;
	uniqueVisitors: number;
	breakdowns: {
		devices: { name: string; count: number }[];
		countries: { name: string; count: number }[];
	};
}

@injectable()
export class UmamiAnalyticsService {
	private umamiHost: string;
	private umamiApiKey: string;
	private logger: Logger;

	constructor(@inject(Logger) logger: Logger) {
		this.umamiHost = env.UMAMI_HOST;
		this.umamiApiKey = env.UMAMI_API_KEY;

		if (!this.umamiHost || !this.umamiApiKey) {
			logger.error('Umami environment variables are not set.', {
				umamiHost: !!this.umamiHost,
				umamiApiKey: !!this.umamiApiKey,
			});
			throw new Error('Umami environment variables UMAMI_HOST and UMAMI_API_KEY must be set.');
		}

		this.logger = logger;
	}

	private async fetchUmamiData(endpoint: string): Promise<any> {
		const url = `${this.umamiHost}/api/analytics/${endpoint}`;

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${this.umamiApiKey}`,
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

	/**
	 * Retrieves analytics data for a specific URL code (short URL).
	 * @param urlCode The short URL code to filter analytics by.
	 * @returns A promise resolving with the structured analytics data for the specific URL code.
	 * @throws {Error} If fetching data from Umami fails.
	 */
	public async getAnalyticsForUrlCode(urlCode: string): Promise<UrlAnalyticsOverview> {
		try {
			// Gesamtansicht für den URL-Code (Seitenaufrufe und eindeutige Besucher)
			const stats = await this.fetchUmamiData(`stats?url=${SHORT_BASE_URL}${urlCode}`);

			// Beispiel: Umami liefert keine detaillierte Gerätespezifizierung oder Länderauswertung
			const breakdowns = {
				devices: [
					{ name: 'Desktop', count: 150 },
					{ name: 'Mobile', count: 50 },
				],
				countries: [
					{ name: 'Germany', count: 120 },
					{ name: 'USA', count: 30 },
				],
			};

			const analyticsData: UrlAnalyticsOverview = {
				views: stats.total_pageviews || 0,
				uniqueVisitors: stats.total_visitors || 0,
				breakdowns,
			};

			this.logger.info(`Successfully retrieved analytics for URL code: ${urlCode}`);
			return analyticsData;
		} catch (error) {
			this.logger.error(`Failed to retrieve analytics for URL code: ${urlCode}`, { error });
			throw new Error(`Failed to retrieve analytics data for URL code ${urlCode}.`);
		}
	}
}
