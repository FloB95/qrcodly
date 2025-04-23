import { inject, injectable } from 'tsyringe';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';
import { SHORT_BASE_URL } from '@/modules/url-shortener/config/constants';

interface UrlAnalyticsOverview {
	views: number; // Gesamte Klicks/Redirects für diesen Code
	uniqueVisitors: number; // Eindeutige Besucher für diesen Code
	breakdowns: {
		devices: { name: string | null; count: number }[];
		countries: { name: string | null; count: number }[];
	};
}

@injectable()
export class PostHogAnalyticsService {
	private posthogHost: string;
	private posthogProjectId: string;
	private logger: Logger;

	constructor(@inject(Logger) logger: Logger) {
		const apiKey = env.POSTHOG_API_KEY;
		const projectId = env.POSTHOG_PROJECT_ID;
		const host = env.POSTHOG_HOST;

		if (!apiKey || !projectId || !host) {
			logger.error('Posthog environment variables are not set.', {
				apiKey: !!apiKey,
				projectId: !!projectId,
				host: !!host,
			});
			throw new Error(
				'Posthog environment variables POSTHOG_API_KEY, POSTHOG_PROJECT_ID, and POSTHOG_HOST must be set.',
			);
		}

		this.posthogHost = host;
		this.posthogProjectId = projectId;
		this.logger = logger;
	}

	private async executeHogQLQuery(query: string): Promise<any[]> {
		const posthogApiUrl = `${this.posthogHost}/api/projects/${this.posthogProjectId}/query/`;

		try {
			const response = await fetch(posthogApiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${process.env.POSTHOG_API_KEY}`,
					'PH-Project-Id': this.posthogProjectId,
				},
				body: JSON.stringify({
					query: {
						kind: 'HogQLQuery',
						query,
					},
				}),
			});

			if (!response.ok) {
				const errorBody = await response.text();
				const errorMsg = `Posthog API Error ${response.status}: ${errorBody}`;
				this.logger.error(errorMsg, { query, status: response.status, body: errorBody });
				throw new Error(`Failed to fetch data from Posthog: ${response.status} - ${errorBody}`);
			}

			const data = await response.json();
			return data.results || [];
		} catch (error) {
			this.logger.error('Error executing HogQL query', { query, error });
			throw error;
		}
	}

	/**
	 * Retrieves analytics data for a specific URL code across all time.
	 * @param urlCode The short URL code to filter analytics by.
	 * @returns A promise resolving with the structured analytics data for the specific URL code.
	 * @throws {Error} If fetching data from Posthog fails.
	 */
	public async getAnalyticsForUrlCode(urlCode: string): Promise<UrlAnalyticsOverview> {
		// Annahme: Dein Redirect-Event heißt 'short-url-redirected'
		// Annahme: Du speicherst den urlCode in der Event-Eigenschaft '$url_code'

		console.log(`${SHORT_BASE_URL}${urlCode}`);

		try {
			// Gesamte Anzahl der Redirects für diesen Code (Gesamter Zeitraum)
			const totalRedirectsQuery = `
                SELECT count() FROM events
                WHERE event = '$pageleave'
                AND properties.$current_url = '${SHORT_BASE_URL}${urlCode}'
            `;

			// Eindeutige Besucher für diesen Code (Gesamter Zeitraum)
			const uniqueVisitorsQuery = `
                SELECT count(distinct distinct_id) FROM events
                WHERE event = '$pageleave'
                AND properties.$current_url = '${SHORT_BASE_URL}${urlCode}'
            `;

			// Breakdown nach Geräten für Redirects dieses Codes (Gesamter Zeitraum)
			const deviceBreakdownQuery = `
							SELECT properties.$device_type, count() FROM events
							WHERE event = '$pageleave'
							AND properties.$current_url = '${SHORT_BASE_URL}${urlCode}'
							AND properties.$device_type IS NOT NULL
							GROUP BY properties.$device_type
							ORDER BY count() DESC
            `;

			// Breakdown nach Ländern für Redirects dieses Codes (Gesamter Zeitraum)
			const countryBreakdownQuery = `
							SELECT properties.$geoip_country_code, count() FROM events
							WHERE event = '$pageleave'
							AND properties.$current_url = '${SHORT_BASE_URL}${urlCode}'
							AND properties.$geoip_country_code IS NOT NULL
							GROUP BY properties.$geoip_country_code
							ORDER BY count() DESC
						`;

			const [
				totalRedirectsResult,
				uniqueVisitorsResult,
				deviceBreakdownResult,
				countryBreakdownResult,
			] = await Promise.all([
				this.executeHogQLQuery(totalRedirectsQuery),
				this.executeHogQLQuery(uniqueVisitorsQuery),
				this.executeHogQLQuery(deviceBreakdownQuery),
				this.executeHogQLQuery(countryBreakdownQuery),
			]);

			console.log('countryBreakdownResult', countryBreakdownResult);

			const analyticsData: UrlAnalyticsOverview = {
				views: totalRedirectsResult?.[0]?.[0] || 0,
				uniqueVisitors: uniqueVisitorsResult?.[0]?.[0] || 0,
				breakdowns: {
					devices:
						deviceBreakdownResult?.map((row: any) => ({ name: row[0], count: row[1] })) || [],
					countries:
						countryBreakdownResult?.map((row: any) => ({ name: row[0], count: row[1] })) || [],
				},
			};

			this.logger.info(`Successfully retrieved analytics for URL code: ${urlCode}`);
			return analyticsData;
		} catch (error) {
			this.logger.error(`Failed to retrieve analytics for URL code: ${urlCode}`, { error });
			throw new Error(`Failed to retrieve analytics data for URL code ${urlCode}.`);
		}
	}
}
