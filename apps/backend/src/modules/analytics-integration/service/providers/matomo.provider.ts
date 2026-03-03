import { singleton } from 'tsyringe';
import { type IAnalyticsProvider, type IScanEventData } from './analytics-provider.interface';
import { anonymizeIp } from '@/utils/general';

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

		const url = `${matomoUrl.replace(/\/$/, '')}/matomo.php?${params.toString()}`;

		const response = await fetch(url, {
			method: 'GET',
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			throw new Error(`Matomo request failed with status ${response.status}`);
		}
	}

	async validateCredentials(credentials: Record<string, unknown>): Promise<boolean> {
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

		const url = `${matomoUrl.replace(/\/$/, '')}/index.php?${params.toString()}`;

		try {
			const response = await fetch(url, {
				method: 'GET',
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) return false;

			const result = (await response.json()) as { idsite?: string } | { result?: string };
			if ('result' in result && result.result === 'error') return false;
			return 'idsite' in result && !!result.idsite;
		} catch {
			return false;
		}
	}
}
