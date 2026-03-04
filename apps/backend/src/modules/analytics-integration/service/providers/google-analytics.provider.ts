import { singleton } from 'tsyringe';
import {
	type IAnalyticsProvider,
	type IScanEventData,
	type IValidationResult,
} from './analytics-provider.interface';
import { anonymizeIp } from '@/utils/general';

interface GA4ValidationMessage {
	fieldPath: string;
	description: string;
	validationCode: string;
}

interface GA4DebugResponse {
	validationMessages?: GA4ValidationMessage[];
}

@singleton()
export class GoogleAnalyticsProvider implements IAnalyticsProvider {
	private readonly GA_COLLECT_URL = 'https://www.google-analytics.com/mp/collect';
	private readonly GA_DEBUG_URL = 'https://www.google-analytics.com/debug/mp/collect';

	async sendEvent(event: IScanEventData, credentials: Record<string, unknown>): Promise<void> {
		const { measurementId, apiSecret } = credentials as {
			measurementId: string;
			apiSecret: string;
		};

		const queryParams = new URLSearchParams({
			measurement_id: measurementId,
			api_secret: apiSecret,
		});
		const payload = this.buildPayload(event);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		const body = JSON.stringify(payload);

		// Step 1: Validate against the debug endpoint (returns actual error info)
		const debugResponse = await fetch(`${this.GA_DEBUG_URL}?${queryParams}`, {
			method: 'POST',
			headers,
			body,
			signal: AbortSignal.timeout(5000),
		});

		if (!debugResponse.ok) {
			throw new Error(`GA4 debug endpoint returned status ${debugResponse.status}`);
		}

		const debugResult = (await debugResponse.json()) as GA4DebugResponse;
		if (debugResult.validationMessages && debugResult.validationMessages.length > 0) {
			const errors = debugResult.validationMessages
				.map((m) => `${m.fieldPath}: ${m.description} (${m.validationCode})`)
				.join('; ');
			throw new Error(`GA4 validation failed: ${errors}`);
		}

		// Step 2: Send to the real collect endpoint (only if validation passed)
		const collectResponse = await fetch(`${this.GA_COLLECT_URL}?${queryParams.toString()}`, {
			method: 'POST',
			headers,
			body,
			signal: AbortSignal.timeout(5000),
		});

		if (!collectResponse.ok) {
			throw new Error(`GA4 collect endpoint returned status ${collectResponse.status}`);
		}
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
		const params = new URLSearchParams({
			measurement_id: measurementId,
			api_secret: apiSecret,
		});
		const url = `${this.GA_DEBUG_URL}?${params.toString()}`;
		const body = {
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

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) return { valid: false, credentialsVerified: false };

			const result = (await response.json()) as GA4DebugResponse;
			const formatValid = !result.validationMessages || result.validationMessages.length === 0;
			return { valid: formatValid, credentialsVerified: false };
		} catch {
			return { valid: false, credentialsVerified: false };
		}
	}

	private buildPayload(event: IScanEventData) {
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
