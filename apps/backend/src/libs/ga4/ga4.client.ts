import { singleton } from 'tsyringe';
import { trackExternal } from '@/core/metrics';
import { Ga4ApiError } from './ga4.error';
import { type IGa4Credentials, type IGa4DebugResponse, type IGa4Payload } from './ga4.interface';

const COLLECT_URL = 'https://www.google-analytics.com/mp/collect';
const DEBUG_URL = 'https://www.google-analytics.com/debug/mp/collect';
const TIMEOUT_MS = 5000;

/** HTTP client for the GA4 Measurement Protocol */
@singleton()
export class Ga4Client {
	/** An error status is rejected with a Ga4ApiError */
	async collect(credentials: IGa4Credentials, payload: IGa4Payload): Promise<void> {
		const response = await this.post(COLLECT_URL, 'collect', credentials, payload);
		if (!response.ok) throw new Ga4ApiError(response.status, 'collect');
	}

	/**
	 * True when the debug endpoint reports no validation messages. It only validates the payload
	 * structure, not the credentials. An error status is rejected with a Ga4ApiError.
	 */
	async validate(credentials: IGa4Credentials, payload: IGa4Payload): Promise<boolean> {
		const response = await this.post(DEBUG_URL, 'validate', credentials, payload);
		if (!response.ok) throw new Ga4ApiError(response.status, 'debug');

		const result = (await response.json()) as IGa4DebugResponse;
		return !result.validationMessages || result.validationMessages.length === 0;
	}

	private post(
		url: string,
		operation: string,
		{ measurementId, apiSecret }: IGa4Credentials,
		payload: IGa4Payload,
	): Promise<Response> {
		const query = new URLSearchParams({ measurement_id: measurementId, api_secret: apiSecret });
		const body = JSON.stringify(payload);

		return trackExternal('google_analytics', operation, () =>
			fetch(`${url}?${query.toString()}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
				signal: AbortSignal.timeout(TIMEOUT_MS),
			}),
		);
	}
}
