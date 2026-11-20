import { inject, singleton } from 'tsyringe';
import {
	type IAnalyticsProvider,
	type IScanEventData,
	type IValidationResult,
} from './analytics-provider.interface';
import { anonymizeIp } from '@/utils/general';
import { Ga4Client, type IGa4Payload } from '@/libs/ga4';

const VALIDATION_PAYLOAD: IGa4Payload = {
	client_id: 'test_validation',
	events: [
		{
			name: 'page_view',
			params: {
				page_location: 'https://example.com/test',
				page_title: 'Test',
			},
		},
	],
};

@singleton()
export class GoogleAnalyticsProvider implements IAnalyticsProvider {
	constructor(@inject(Ga4Client) private readonly ga4Client: Ga4Client) {}

	async sendEvent(event: IScanEventData, credentials: Record<string, unknown>): Promise<void> {
		const { measurementId, apiSecret } = credentials as {
			measurementId: string;
			apiSecret: string;
		};

		// Send directly to collect endpoint (debug endpoint only validates payload
		// structure, not credentials, and adds unnecessary latency/dependency)
		await this.ga4Client.collect({ measurementId, apiSecret }, this.buildPayload(event));
	}

	async validateCredentials(credentials: Record<string, unknown>): Promise<IValidationResult> {
		const { measurementId, apiSecret } = credentials as {
			measurementId: string;
			apiSecret: string;
		};

		// GA4 Measurement Protocol does not provide a public API to verify
		// measurement_id or api_secret authenticity. The debug endpoint only
		// validates event payload structure, not credentials. We validate the
		// payload format and return credentialsVerified: false to indicate that
		// actual credential verification is not possible.
		try {
			const formatValid = await this.ga4Client.validate(
				{ measurementId, apiSecret },
				VALIDATION_PAYLOAD,
			);
			return { valid: formatValid, credentialsVerified: false };
		} catch {
			return { valid: false, credentialsVerified: false };
		}
	}

	private buildPayload(event: IScanEventData): IGa4Payload {
		return {
			client_id: this.generateClientId(),
			ip_override: anonymizeIp(event.ip),
			events: [
				{
					name: 'page_view',
					params: {
						page_location: event.url,
						page_title: 'QR Code Scan',
						page_referrer: event.referrer,
						language: event.language,
						source: 'qr_code',
					},
				},
			],
		};
	}

	private generateClientId(): string {
		return `${Math.floor(Math.random() * 2147483647)}.${Date.now()}`;
	}
}
