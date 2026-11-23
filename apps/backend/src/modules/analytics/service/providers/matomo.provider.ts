import { inject, singleton } from 'tsyringe';
import {
	type IAnalyticsProvider,
	type IScanEventData,
	type IValidationResult,
} from './analytics-provider.interface';
import { anonymizeIp } from '@/utils/general';
import { MatomoClient } from '@/libs/matomo';

@singleton()
export class MatomoProvider implements IAnalyticsProvider {
	constructor(@inject(MatomoClient) private readonly matomoClient: MatomoClient) {}

	async sendEvent(event: IScanEventData, credentials: Record<string, unknown>): Promise<void> {
		const { matomoUrl, siteId, authToken } = credentials as {
			matomoUrl: string;
			siteId: string;
			authToken?: string;
		};

		await this.matomoClient.track(matomoUrl, {
			siteId,
			actionName: 'QR Code Scan',
			url: event.url,
			referrer: event.referrer,
			language: event.language,
			customVariables: {
				'1': ['Device Type', event.deviceType],
				'2': ['Browser', event.browserName],
			},
			auth: authToken ? { token: authToken, clientIp: anonymizeIp(event.ip) } : undefined,
		});
	}

	async validateCredentials(credentials: Record<string, unknown>): Promise<IValidationResult> {
		const { matomoUrl, siteId, authToken } = credentials as {
			matomoUrl: string;
			siteId: string;
			authToken?: string;
		};

		const check = await this.matomoClient.checkSite(matomoUrl, siteId, authToken);
		return { valid: check === 'accepted', credentialsVerified: check !== 'unreachable' };
	}
}
