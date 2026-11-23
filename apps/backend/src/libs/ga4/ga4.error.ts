import { type TGa4Endpoint } from './ga4.interface';

/** A Measurement Protocol endpoint answered with an error status */
export class Ga4ApiError extends Error {
	constructor(
		readonly status: number,
		endpoint: TGa4Endpoint,
	) {
		super(`GA4 ${endpoint} endpoint returned status ${status}`);
		this.name = 'Ga4ApiError';
	}
}
