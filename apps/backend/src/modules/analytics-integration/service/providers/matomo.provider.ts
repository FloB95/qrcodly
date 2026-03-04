import { singleton } from 'tsyringe';
import {
	type IAnalyticsProvider,
	type IScanEventData,
	type IValidationResult,
} from './analytics-provider.interface';
import { anonymizeIp } from '@/utils/general';

function validateMatomoUrl(raw: string): URL {
	const url = new URL(raw);
	if (url.protocol !== 'https:' && url.protocol !== 'http:') {
		throw new Error('Matomo URL must use HTTP or HTTPS');
	}
	const hostname = url.hostname.toLowerCase();
	if (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '::1' ||
		hostname === '0.0.0.0' ||
		hostname.endsWith('.local') ||
		hostname.startsWith('10.') ||
		hostname.startsWith('192.168.') ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
		hostname === '169.254.169.254'
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
			action_name: 'QR Code Scan',
			url: event.url,
			urlref: event.referrer,
			lang: event.language,
			cip: anonymizeIp(event.ip),
			_cvar: JSON.stringify({
				'1': ['Device Type', event.deviceType],
				'2': ['Browser', event.browserName],
			}),
		});

		if (authToken) {
			params.set('token_auth', authToken);
		}

		const baseUrl = validateMatomoUrl(matomoUrl);
		const fetchUrl = new URL('/matomo.php', baseUrl);
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

		const params = new URLSearchParams({
			module: 'API',
			method: 'SitesManager.getSiteFromId',
			idSite: siteId,
			format: 'JSON',
		});

		if (authToken) {
			params.set('token_auth', authToken);
		}

		const baseUrl = validateMatomoUrl(matomoUrl);
		const fetchUrl = new URL('/index.php', baseUrl);
		fetchUrl.search = params.toString();

		try {
			const response = await fetch(fetchUrl.toString(), {
				method: 'GET',
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) return { valid: false, credentialsVerified: true };

			const result = (await response.json()) as { idsite?: string } | { result?: string };
			if ('result' in result && result.result === 'error')
				return { valid: false, credentialsVerified: true };
			const valid = 'idsite' in result && !!result.idsite;
			return { valid, credentialsVerified: true };
		} catch {
			return { valid: false, credentialsVerified: true };
		}
	}
}
