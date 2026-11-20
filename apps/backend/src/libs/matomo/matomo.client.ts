import { singleton } from 'tsyringe';
import { trackExternal } from '@/core/metrics';
import { MatomoApiError } from './matomo.error';
import { type IMatomoTrackRequest, type TMatomoSiteCheck } from './matomo.interface';

const TIMEOUT_MS = 5000;

function validateMatomoUrl(raw: string): URL {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new Error('Invalid Matomo URL format');
	}
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

/** `file` below the path of the Matomo URL, with `params` as the query */
function endpoint(baseUrl: URL, file: string, params: URLSearchParams): URL {
	const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
	const url = new URL(baseUrl.toString());
	url.pathname = `${basePath}${file}`;
	url.search = params.toString();
	return url;
}

/** HTTP client for the Tracking and Reporting API of a Matomo instance given per call */
@singleton()
export class MatomoClient {
	/** Throws for a URL that is not HTTPS or points to a private address, and on a non-2xx answer */
	async track(matomoUrl: string, request: IMatomoTrackRequest): Promise<void> {
		const params = new URLSearchParams({
			idsite: request.siteId,
			rec: '1',
			apiv: '1',
			bots: '1',
			action_name: request.actionName,
			url: request.url,
			urlref: request.referrer,
			lang: request.language,
			send_image: '0',
			_cvar: JSON.stringify(request.customVariables),
		});

		if (request.auth) {
			params.set('token_auth', request.auth.token);
			params.set('cip', request.auth.clientIp);
		}

		const fetchUrl = endpoint(validateMatomoUrl(matomoUrl), 'matomo.php', params);

		const response = await trackExternal('matomo', 'track', () =>
			fetch(fetchUrl.toString(), {
				method: 'GET',
				signal: AbortSignal.timeout(TIMEOUT_MS),
			}),
		);

		if (!response.ok) {
			throw new MatomoApiError(response.status);
		}
	}

	/** Throws for a URL that is not HTTPS or points to a private address; never for Matomo's answer */
	async checkSite(
		matomoUrl: string,
		siteId: string,
		authToken?: string,
	): Promise<TMatomoSiteCheck> {
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
			const fetchUrl = endpoint(baseUrl, 'index.php', params);

			try {
				const response = await trackExternal('matomo', 'validate', () =>
					fetch(fetchUrl.toString(), {
						method: 'GET',
						signal: AbortSignal.timeout(TIMEOUT_MS),
					}),
				);

				if (response.ok) {
					const result = (await response.json()) as { idsite?: string } | { result?: string };
					if ('result' in result && result.result === 'error') return 'rejected';
					return 'idsite' in result && !!result.idsite ? 'accepted' : 'rejected';
				}
				// 401/403 → auth token is invalid
				return 'rejected';
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
			const trackUrl = endpoint(baseUrl, 'matomo.php', trackParams);

			const response = await trackExternal('matomo', 'validate_track', () =>
				fetch(trackUrl.toString(), {
					method: 'GET',
					signal: AbortSignal.timeout(TIMEOUT_MS),
				}),
			);

			return response.ok ? 'accepted' : 'rejected';
		} catch {
			return 'unreachable';
		}
	}
}
