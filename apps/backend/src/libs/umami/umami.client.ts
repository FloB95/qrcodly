import { inject, singleton } from 'tsyringe';
import QueryString from 'qs';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';
import { trackExternal, umamiEventsTotal } from '@/core/metrics';
import {
	type IUmamiDataPoint,
	type IUmamiEventPayload,
	type IUmamiLoginResponse,
	type IUmamiMetricsQuery,
	type IUmamiPageviews,
	type IUmamiWebsiteQuery,
	type IUmamiWebsiteStats,
	type TUmamiSendOutcome,
} from './umami.interface';

const SEND_TIMEOUT_MS = 5_000;
const ERROR_BODY_LIMIT = 500;

/** HTTP client for a self-hosted Umami and the one website this app tracks */
@singleton()
export class UmamiClient {
	/** Fetched on first use, shared by concurrent callers and kept until Umami rejects it */
	private authToken?: Promise<string>;

	constructor(@inject(Logger) private readonly logger: Logger) {}

	async getWebsiteStats(query: IUmamiWebsiteQuery): Promise<IUmamiWebsiteStats> {
		return this.get(`websites/${env.UMAMI_WEBSITE}/stats`, query);
	}

	async getWebsitePageviews(query: IUmamiWebsiteQuery): Promise<IUmamiPageviews> {
		return this.get(`websites/${env.UMAMI_WEBSITE}/pageviews`, query);
	}

	async getWebsiteMetrics(query: IUmamiMetricsQuery): Promise<IUmamiDataPoint[]> {
		return this.get(`websites/${env.UMAMI_WEBSITE}/metrics`, query);
	}

	/**
	 * Sends an event for the configured website and reports what Umami did with it. Never throws.
	 *
	 * Umami answers 200 in two very different cases: when it stores the event, and when its
	 * bot filter silently discards it. Only the storing path echoes a cache token in the body,
	 * so an empty 200 means the event never landed. Without that distinction the scan counter
	 * and the Umami dashboard drift apart with nothing in the logs to explain it.
	 */
	async sendEvent(event: IUmamiEventPayload): Promise<TUmamiSendOutcome> {
		try {
			const response = await trackExternal('umami', 'send_event', () =>
				fetch(`${env.UMAMI_HOST}/api/send`, {
					method: 'POST',
					signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': event.userAgent,
						'X-Client-Real-IP': event.ip,
					},
					body: JSON.stringify({
						type: 'event',
						payload: { website: env.UMAMI_WEBSITE, ...event },
					}),
				}),
			);

			const body = await response.text().catch(() => '');

			if (!response.ok) {
				this.logger.error('error.umamiApi.sendEvent', {
					status: response.status,
					body: body.slice(0, ERROR_BODY_LIMIT),
					userAgent: event.userAgent,
				});
				umamiEventsTotal.add(1, { outcome: 'rejected', status: response.status });
				return 'rejected';
			}

			if (body.trim().length === 0) {
				this.logger.warn('umami.event.discarded', {
					reason: 'empty_200_response',
					userAgent: event.userAgent,
					hostname: event.hostname,
				});
				umamiEventsTotal.add(1, { outcome: 'discarded' });
				return 'discarded';
			}

			umamiEventsTotal.add(1, { outcome: 'accepted' });
			return 'accepted';
		} catch (error) {
			this.logger.error('error.umamiApi.sendEvent', { error, userAgent: event.userAgent });
			umamiEventsTotal.add(1, { outcome: 'error' });
			return 'error';
		}
	}

	private async login(): Promise<string> {
		const url = `${env.UMAMI_HOST}/api/auth/login`;
		const body = {
			username: env.UMAMI_USERNAME,
			password: env.UMAMI_PASSWORD,
		};

		try {
			const response = await trackExternal('umami', 'auth_token', () =>
				fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(body),
				}),
			);

			if (!response.ok) {
				const errorBody = await response.text();
				this.logger.error(`error.umamiApi.fetchToken`, {
					status: response.status,
					body: errorBody,
				});
				throw new Error(`Failed to fetch auth token from Umami: ${response.status} - ${errorBody}`);
			}

			const data = (await response.json()) as IUmamiLoginResponse;
			return data.token;
		} catch (error) {
			this.logger.error('error.umamiApi.fetchToken', { error });
			throw error;
		}
	}

	private getToken(): Promise<string> {
		this.authToken ??= this.login().catch((error: unknown) => {
			this.authToken = undefined;
			throw error;
		});
		return this.authToken;
	}

	private async get<T>(endpoint: string, query: object): Promise<T> {
		const queryString = QueryString.stringify(query);
		const url = `${env.UMAMI_HOST}/api/${endpoint}?${queryString}`;
		// Last path segment only — the full endpoint embeds the website id.
		const operation = `fetch:${endpoint.split('/').pop() || 'unknown'}`;

		const token = this.getToken();
		let response = await this.fetchData(url, operation, await token);

		// Umami drops issued tokens when it restarts with a new secret or they expire. Only the
		// first caller to see the rejected token resets it; the others reuse that new login.
		if (response.status === 401) {
			if (this.authToken === token) {
				this.logger.warn('umami.auth.relogin', { operation });
				this.authToken = undefined;
			}
			response = await this.fetchData(url, operation, await this.getToken());
		}

		try {
			if (!response.ok) {
				const errorBody = await response.text();
				this.logger.error(`error.umamiApi.fetchData`, {
					status: response.status,
					body: errorBody,
				});
				throw new Error(`Failed to fetch data from Umami: ${response.status} - ${errorBody}`);
			}

			return response.json() as Promise<T>;
		} catch (error) {
			this.logger.error('error.umamiApi.fetchData', { error });
			throw error;
		}
	}

	private async fetchData(url: string, operation: string, token: string): Promise<Response> {
		try {
			return await trackExternal('umami', operation, () =>
				fetch(url, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}),
			);
		} catch (error) {
			this.logger.error('error.umamiApi.fetchData', { error });
			throw error;
		}
	}
}
