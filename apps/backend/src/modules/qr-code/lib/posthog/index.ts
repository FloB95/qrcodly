// src/services/PosthogAnalyticsService.ts (Beispiel-Pfad)
import { inject, injectable } from 'tsyringe'; // Importiere für Dependency Injection
import { PostHog } from 'posthog-node';
import { formatISO, subDays } from 'date-fns';
// Je nach Node.js Version (<18) musst du eventuell 'node-fetch' installieren und importieren:
// import fetch from 'node-fetch';

// Typ-Definition für die erwarteten Analyseergebnisse
interface AnalyticsOverview {
	totalPageviews: number;
	totalUniqueVisitors: number;
	totalSessions: number;
	breakdowns: {
		devices: { name: string | null; count: number }[];
		countries: { name: string | null; count: number }[];
		// Füge cities hinzu, falls du es in den Abfragen aufnimmst
		// cities: { name: string | null; count: number }[];
	};
}

// Typ-Definition für die Parameter der Abfragemethode
interface GetOverviewAnalyticsParams {
	days?: number; // Anzahl der Tage zurück ab Enddatum
	dateFrom?: string | Date; // Startdatum (überschreibt 'days')
	dateTo?: string | Date; // Enddatum (Standard: jetzt)
}

// Typ-Definition für die Abhängigkeiten des Services (z.B. ein Logger)
interface PosthogAnalyticsServiceDeps {
	logger?: {
		// Minimales Logger-Interface, passe es an deinen tatsächlichen Logger an
		info: (...args: any[]) => void;
		warn: (...args: any[]) => void;
		error: (...args: any[]) => void;
		debug: (...args: any[]) => void;
	};
	// Füge hier weitere Abhängigkeiten hinzu
}

/**
 * Service class to fetch analytics data from the Posthog API.
 * Designed for use in a general Node.js environment.
 */
@injectable() // Ermöglicht das Injizieren dieses Services durch tsyringe
export class PosthogAnalyticsService {
	private posthogClient: PostHog;
	private posthogHost: string;
	private posthogProjectId: string;
	private logger?: PosthogAnalyticsServiceDeps['logger']; // Optionaler Logger

	constructor() // Injiziere Abhängigkeiten über den Konstruktor
	// @inject('Logger') logger?: PosthogAnalyticsServiceDeps['logger'] // Beispiel-Injektion
	{
		// In einer Node.js App greifst du direkt über process.env zu
		const apiKey = process.env.POSTHOG_API_KEY;
		const projectId = process.env.POSTHOG_PROJECT_ID;
		// Nutze POSTHOG_HOST oder NEXT_PUBLIC_POSTHOG_HOST, je nach Konvention deiner App
		const host =
			process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

		// Grundlegende Validierung der Umgebungsvariablen
		if (!apiKey || !projectId) {
			// Wirf hier einen Fehler, da der Service nicht initialisiert werden kann
			throw new Error(
				'POSTHOG_API_KEY and POSTHOG_PROJECT_ID environment variables are required to initialize PosthogAnalyticsService.',
			);
		}

		// Initialisiere den Posthog Node.js Client
		this.posthogClient = new PostHog(apiKey, {
			host: host,
			// Weitere Konfigurationen nach Bedarf
			flushAt: 1,
			flushInterval: 0,
		});
		this.posthogHost = host;
		this.posthogProjectId = projectId;
		// this.logger = logger; // Logger zuweisen, falls injiziert
	}

	/**
	 * Executes a HogQL query against the Posthog API.
	 * This is a private helper method for internal use.
	 * @param query The HogQL query string.
	 * @returns A promise resolving with the query results array.
	 * @throws {Error} If the API request fails.
	 */
	private async executeHogQLQuery(query: string): Promise<any[]> {
		const posthogApiUrl = `${this.posthogHost}/api/query/`;

		try {
			// Nutze fetch, das in modernen Node.js Versionen global verfügbar ist
			const response = await fetch(posthogApiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// Nutze den API Key aus den Umgebungsvariablen oder einer sicheren Konfiguration
					Authorization: `Bearer ${process.env.POSTHOG_API_KEY}`,
					'PH-Project-Id': this.posthogProjectId,
				},
				body: JSON.stringify({ query }),
				// Cache-Control ist hier nicht relevant, da es ein serverseitiger Fetch ist.
				// Die Caching-Strategie wird dort implementiert, wo dieser Service aufgerufen wird (z.B. in einem API-Handler).
			});

			if (!response.ok) {
				const errorBody = await response.text();
				const errorMsg = `Posthog API Error ${response.status}: ${errorBody}`;
				this.logger?.error(errorMsg, { query }); // Logge die fehlerhafte Abfrage
				throw new Error(`Failed to fetch data from Posthog: ${response.statusText}`);
			}

			const data = await response.json();
			// HogQL Ergebnisse sind oft im 'results' Feld enthalten.
			// Prüfe die genaue API-Antwort-Struktur für deine Posthog-Version.
			return data.results || [];
		} catch (error) {
			this.logger?.error('Error executing HogQL query', { query, error }); // Logge den Fehler
			throw error; // Wirf den Fehler weiter, damit der Aufrufer ihn behandeln kann
		}
	}

	/**
	 * Retrieves a general overview of website analytics metrics from Posthog
	 * for a specified date range.
	 * @param params - Optional parameters for the date range. Defaults to last 7 days.
	 * @returns A promise resolving with the structured analytics overview data.
	 * @throws {Error} If fetching data from Posthog fails.
	 */
	public async getOverviewAnalytics(
		params?: GetOverviewAnalyticsParams,
	): Promise<AnalyticsOverview> {
		const days = params?.days ?? 7; // Standard: 7 Tage
		let startDate: Date;
		// Standard: Enddatum ist jetzt, kann aber überschrieben werden
		const endDate: Date =
			params?.dateTo instanceof Date
				? params.dateTo
				: params?.dateTo
					? new Date(params.dateTo)
					: new Date();

		if (params?.dateFrom instanceof Date) {
			startDate = params.dateFrom;
		} else if (params?.dateFrom) {
			startDate = new Date(params.dateFrom);
		} else {
			// Berechne Startdatum basierend auf der Anzahl der Tage
			startDate = subDays(endDate, days);
		}

		// Formatierung der Daten für die HogQL-Abfragen (ISO 8601 ist üblich)
		const startDateISO = formatISO(startDate);
		const endDateISO = formatISO(endDate);

		try {
			// Definiere die HogQL-Abfragen für jede Metrik/Breakdown
			// Passe Event-Namen und Eigenschafts-Pfade genau an dein Posthog-Projekt an!
			const pageViewsQuery = `
                SELECT count() FROM events
                WHERE event = '$pageview'
                AND timestamp BETWEEN '${startDateISO}' AND '${endDateISO}'
            `;

			const uniqueVisitorsQuery = `
                SELECT count(distinct distinct_id) FROM events
                WHERE event = '$pageview' -- Oder WHERE event IS NOT NULL für alle Events
                AND timestamp BETWEEN '${startDateISO}' AND '${endDateISO}'
            `;

			// Sessions-Abfrage: Prüfe deine Posthog-Doku für die exakte HogQL-Syntax,
			// besonders wenn die 'sessions'-Tabelle nicht der Standardweg ist.
			const sessionsQuery = `
                SELECT count() FROM sessions
                WHERE start_timestamp BETWEEN '${startDateISO}' AND '${endDateISO}'
            `;

			const deviceBreakdownQuery = `
                SELECT properties.$device_type, count() FROM events
                WHERE event = '$pageview'
                AND timestamp BETWEEN '${startDateISO}' AND '${endDateISO}'
                AND properties.$device_type IS NOT NULL -- Schließe null Werte aus, falls unerwünscht
                GROUP BY properties.$device_type
                ORDER BY count() DESC
            `;

			const countryBreakdownQuery = `
                SELECT properties.$geoip_country_code, count() FROM events
                WHERE event = '$pageview'
                AND timestamp BETWEEN '${startDateISO}' AND '${endDateISO}'
                AND properties.$geoip_country_code IS NOT NULL -- Schließe null Werte aus
                GROUP BY properties.$geoip_country_code
                ORDER BY count() DESC
            `;

			// Führe alle Abfragen parallel aus, um die Gesamtzeit zu reduzieren
			const [
				pageViewsResult,
				uniqueVisitorsResult,
				sessionsResult,
				deviceBreakdownResult,
				countryBreakdownResult,
				// cityBreakdownResult, // Falls du Städte aufnimmst
			] = await Promise.all([
				this.executeHogQLQuery(pageViewsQuery),
				this.executeHogQLQuery(uniqueVisitorsQuery),
				this.executeHogQLQuery(sessionsQuery),
				this.executeHogQLQuery(deviceBreakdownQuery),
				this.executeHogQLQuery(countryBreakdownQuery),
				// this.executeHogQLQuery(cityBreakdownQuery), // Falls du Städte aufnimmst
			]);

			// Verarbeite die Ergebnisse und strukturiere die finale Antwort
			// Die Ergebnisse von HogQL sind oft Arrays von Arrays, z.B. [[count]] oder [[prop_value, count]]
			const analyticsData: AnalyticsOverview = {
				// Nehme den ersten Wert aus dem ersten inneren Array
				totalPageviews: pageViewsResult?.[0]?.[0] || 0,
				totalUniqueVisitors: uniqueVisitorsResult?.[0]?.[0] || 0,
				totalSessions: sessionsResult?.[0]?.[0] || 0,
				breakdowns: {
					// Mappe Breakdown-Ergebnisse in ein Array von { name, count } Objekten
					devices:
						deviceBreakdownResult?.map((row: any) => ({ name: row[0], count: row[1] })) || [],
					countries:
						countryBreakdownResult?.map((row: any) => ({ name: row[0], count: row[1] })) || [],
					// cities: cityBreakdownResult?.map((row: any) => ({ name: row[0], count: row[1] })) || [], // Falls du Städte aufnimmst
				},
			};

			this.logger?.info('Successfully retrieved overview analytics from Posthog'); // Logge Erfolg
			return analyticsData; // Gebe die strukturierten Daten zurück
		} catch (error) {
			// Logge den Fehler und wirf ihn neu, damit der Aufrufer (z.B. ein API-Handler) ihn behandeln kann
			this.logger?.error('Failed to retrieve overview analytics from Posthog', { error });
			throw new Error('Failed to retrieve analytics data from Posthog.'); // Wirf einen generischen Fehler für den Konsumenten
		}
	}

	// Du kannst hier weitere Methoden hinzufügen, um spezifischere Analysen abzurufen,
	// z.B. getRedirectCountsByCode(urlCode: string, params: GetOverviewAnalyticsParams): Promise<{ urlCode: string; count: number } | null>
}
