/** The Matomo Tracking API answered with an error status */
export class MatomoApiError extends Error {
	constructor(readonly status: number) {
		super(`Matomo request failed with status ${status}`);
		this.name = 'MatomoApiError';
	}
}
