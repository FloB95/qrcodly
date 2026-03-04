import { singleton } from 'tsyringe';
import {
	type IAnalyticsProvider,
	type IScanEventData,
	type IValidationResult,
} from './analytics-provider.interface';
import { anonymizeIp } from '@/utils/general';

function validateMatomoUrl(raw: string): URL {
	const url = new URL(raw);
	if (url.protocol !== 'https:') {
		throw new Error('Matomo URL must use HTTPS');
	}
	const hostname = url.hostname.toLowerCase();
	if (
		hostname === 'localhost' ||
		hostname === '::1' ||
		hostname === '0.0.0.0' ||
		hostname.endsWith('.local') ||
		/^127\./.test(hostname) ||
		hostname.startsWith('10.') ||
		hostname.startsWith('192.168.') ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
		/^169\.254\./.test(hostname) ||
		/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(hostname)
	) {
		throw new Error('Matomo URL must not point to a private or internal address');
	}
	return url;
}

@singleton()
export class MatomoProvider implements IAnalyticsProvider {
	async sendEvent(event: IScanEventData, credentials: Record<string, unknown>): Promise<void> {
		const { matomoUrl, siteId, authToken } = credentials as {
			matomoUrl: string;
			siteId: string;
			authToken?: string;
		};

		const params = new URLSearchParams({
			idsite: siteId,
			rec: '1',
			apiv: '1',
			bots: '1',
			action_name: 'QR Code Scan',
			url: event.url,
			urlref: event.referrer,
			lang: event.language,
			send_image: '0',
			_cvar: JSON.stringify({
				'1': ['Device Type', event.deviceType],
				'2': ['Browser', event.browserName],
			}),
		});

		// cip (client IP override) requires token_auth; Matomo Cloud returns 400 without it
		if (authToken) {
			params.set('token_auth', authToken);
			params.set('cip', anonymizeIp(event.ip));
		}

		const baseUrl = validateMatomoUrl(matomoUrl);
		const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
		const fetchUrl = new URL(baseUrl.toString());
		fetchUrl.pathname = `${basePath}matomo.php`;
		fetchUrl.search = params.toString();

		const response = await fetch(fetchUrl.toString(), {
			method: 'GET',
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			throw new Error(`Matomo request failed with status ${response.status}`);
		}
	}

	async validateCredentials(credentials: Record<string, unknown>): Promise<IValidationResult> {
		const { matomoUrl, siteId, authToken } = credentials as {
			matomoUrl: string;
			siteId: string;
			authToken?: string;
		};

		const baseUrl = validateMatomoUrl(matomoUrl);

		// Try the Reporting API first (requires auth token for most Matomo Cloud instances)
		if (authToken) {
			const params = new URLSearchParams({
				module: 'API',
				method: 'SitesManager.getSiteFromId',
				idSite: siteId,
				format: 'JSON',
				token_auth: authToken,
			});

			const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
			const fetchUrl = new URL(baseUrl.toString());
			fetchUrl.pathname = `${basePath}index.php`;
			fetchUrl.search = params.toString();

			try {
				const response = await fetch(fetchUrl.toString(), {
					method: 'GET',
					signal: AbortSignal.timeout(5000),
				});

				if (response.ok) {
					const result = (await response.json()) as { idsite?: string } | { result?: string };
					if ('result' in result && result.result === 'error')
						return { valid: false, credentialsVerified: true };
					const valid = 'idsite' in result && !!result.idsite;
					return { valid, credentialsVerified: true };
				}
				// 401/403 → auth token is invalid
				return { valid: false, credentialsVerified: true };
			} catch {
				// Network error → fall through to tracking endpoint test
			}
		}

		// Fallback: validate URL + siteId via the tracking endpoint.
		// Matomo returns 200 (GIF) for valid sites and 400 for invalid ones.
		try {
			const trackParams = new URLSearchParams({
				idsite: siteId,
				rec: '1',
				action_name: 'Connection Test',
				url: matomoUrl,
				send_image: '0',
			});

			const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
			const trackUrl = new URL(baseUrl.toString());
			trackUrl.pathname = `${basePath}matomo.php`;
			trackUrl.search = trackParams.toString();

			const response = await fetch(trackUrl.toString(), {
				method: 'GET',
				signal: AbortSignal.timeout(5000),
			});

			return { valid: response.ok, credentialsVerified: true };
		} catch {
			return { valid: false, credentialsVerified: false };
		}
	}
}
