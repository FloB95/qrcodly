/** listmonk answered with an error status. The response body can echo the email, so it is not kept. */
export class ListmonkApiError extends Error {
	constructor(
		readonly status: number,
		operation: string,
	) {
		super(`listmonk ${operation} returned ${status}`);
		this.name = 'ListmonkApiError';
	}
}
