import { inject, singleton } from 'tsyringe';
import { Logger } from '@/core/logging';
import { env } from '@/core/config/env';

/**
 * Cloudflare Custom Hostname SSL validation record.
 */
export interface ICloudflareValidationRecord {
	txt_name: string;
	txt_value: string;
}

/**
 * Cloudflare Custom Hostname ownership verification.
 */
export interface ICloudflareOwnershipVerification {
	type: 'txt';
	name: string;
	value: string;
}

/**
 * Cloudflare Custom Hostname SSL details.
 */
export interface ICloudflareSSL {
	id?: string;
	status:
		| 'initializing'
		| 'pending_validation'
		| 'pending_issuance'
		| 'pending_deployment'
		| 'active'
		| 'pending_expiration'
		| 'expired'
		| 'deleted'
		| 'validation_timed_out';
	method: 'txt' | 'http' | 'cname';
	type: 'dv';
	validation_records?: ICloudflareValidationRecord[];
	validation_errors?: Array<{ message: string }>;
}

/**
 * Cloudflare Custom Hostname response.
 */
export interface ICloudflareCustomHostname {
	id: string;
	hostname: string;
	ssl: ICloudflareSSL;
	ownership_verification?: ICloudflareOwnershipVerification;
	ownership_verification_http?: {
		http_url: string;
		http_body: string;
	};
	status: 'active' | 'pending' | 'active_redeploying' | 'moved' | 'deleted' | 'pending_deletion';
	created_at: string;
}

/**
 * Cloudflare API response wrapper.
 */
interface ICloudflareApiResponse<T> {
	success: boolean;
	result: T;
	errors: Array<{ code: number; message: string }>;
	messages: Array<{ code: number; message: string }>;
}

/**
 * Error thrown when Cloudflare API operations fail.
 */
export class CloudflareApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly errors: Array<{ code: number; message: string }> = [],
	) {
		super(message);
		this.name = 'CloudflareApiError';
	}
}

/**
 * Service for interacting with Cloudflare Custom Hostnames API.
 *
 * @see https://developers.cloudflare.com/api/resources/custom_hostnames/
 */
@singleton()
export class CloudflareService {
	private readonly apiToken: string;
	private readonly zoneId: string;
	private readonly baseUrl = 'https://api.cloudflare.com/client/v4';
	private readonly logger: Logger;
	private readonly isTestEnvironment: boolean;

	constructor(@inject(Logger) logger: Logger) {
		this.apiToken = env.CLOUDFLARE_API_TOKEN;
		this.zoneId = env.CLOUDFLARE_ZONE_ID;
		this.logger = logger;
		this.isTestEnvironment = process.env.NODE_ENV === 'test';
	}

	/**
	 * Returns a mock custom hostname response for testing.
	 */
	private mockCustomHostname(hostname: string, id?: string): ICloudflareCustomHostname {
		const hostnameId = id || `mock-cf-id-${Date.now()}`;
		return {
			id: hostnameId,
			hostname,
			ssl: {
				id: `ssl-${hostnameId}`,
				status: 'pending_validation',
				method: 'txt',
				type: 'dv',
				validation_records: [
					{
						txt_name: `_acme-challenge.${hostname}`,
						txt_value: `mock-validation-token-${Date.now()}`,
					},
				],
			},
			ownership_verification: {
				type: 'txt',
				name: `_cf-custom-hostname.${hostname}`,
				value: `mock-ownership-token-${Date.now()}`,
			},
			status: 'pending',
			created_at: new Date().toISOString(),
		};
	}

	/**
	 * Makes a request to the Cloudflare API.
	 */
	private async request<T>(
		method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
		endpoint: string,
		body?: object,
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		this.logger.debug('cloudflare.api.request', { method, endpoint });

		try {
			const response = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${this.apiToken}`,
					'Content-Type': 'application/json',
				},
				body: body ? JSON.stringify(body) : undefined,
			});

			const data = (await response.json()) as ICloudflareApiResponse<T>;

			if (!response.ok || !data.success) {
				const errorMessage =
					data.errors?.[0]?.message || `Cloudflare API error: ${response.status}`;
				this.logger.error('cloudflare.api.error', {
					status: response.status,
					errors: data.errors,
					endpoint,
				});
				throw new CloudflareApiError(errorMessage, response.status, data.errors);
			}

			this.logger.debug('cloudflare.api.success', { endpoint });
			return data.result;
		} catch (error) {
			if (error instanceof CloudflareApiError) {
				throw error;
			}
			this.logger.error('cloudflare.api.error', { error, endpoint });
			throw new CloudflareApiError(
				`Failed to connect to Cloudflare API: ${(error as Error).message}`,
				500,
			);
		}
	}

	/**
	 * Creates a new custom hostname with Cloudflare.
	 *
	 * @param hostname - The hostname to add (e.g., "links.example.com")
	 * @returns The created custom hostname with SSL validation records
	 */
	async createCustomHostname(hostname: string): Promise<ICloudflareCustomHostname> {
		this.logger.info('cloudflare.customHostname.create', { hostname });

		// Return mock response in test environment
		if (this.isTestEnvironment) {
			const mockResult = this.mockCustomHostname(hostname);
			this.logger.debug('cloudflare.customHostname.mock', { hostname });
			return mockResult;
		}

		const result = await this.request<ICloudflareCustomHostname>(
			'POST',
			`/zones/${this.zoneId}/custom_hostnames`,
			{
				hostname,
				ssl: {
					method: 'txt',
					type: 'dv',
					settings: {
						min_tls_version: '1.2',
					},
				},
			},
		);

		this.logger.info('cloudflare.customHostname.created', {
			hostname,
			cloudflareId: result.id,
			sslStatus: result.ssl.status,
		});

		return result;
	}

	/**
	 * Gets the current status of a custom hostname.
	 *
	 * @param hostnameId - The Cloudflare custom hostname ID
	 * @returns The custom hostname details including current SSL status
	 */
	async getCustomHostname(hostnameId: string): Promise<ICloudflareCustomHostname> {
		this.logger.debug('cloudflare.customHostname.get', { hostnameId });

		// Return mock response in test environment
		if (this.isTestEnvironment) {
			const mockResult = this.mockCustomHostname('test.example.com', hostnameId);
			this.logger.debug('cloudflare.customHostname.mock.get', { hostnameId });
			return mockResult;
		}

		const result = await this.request<ICloudflareCustomHostname>(
			'GET',
			`/zones/${this.zoneId}/custom_hostnames/${hostnameId}`,
		);

		this.logger.debug('cloudflare.customHostname.status', {
			hostnameId,
			sslStatus: result.ssl.status,
			status: result.status,
		});

		return result;
	}

	/**
	 * Deletes a custom hostname from Cloudflare.
	 *
	 * @param hostnameId - The Cloudflare custom hostname ID
	 */
	async deleteCustomHostname(hostnameId: string): Promise<void> {
		this.logger.info('cloudflare.customHostname.delete', { hostnameId });

		// Skip deletion in test environment
		if (this.isTestEnvironment) {
			this.logger.debug('cloudflare.customHostname.mock.delete', { hostnameId });
			return;
		}

		await this.request<{ id: string }>(
			'DELETE',
			`/zones/${this.zoneId}/custom_hostnames/${hostnameId}`,
		);

		this.logger.info('cloudflare.customHostname.deleted', { hostnameId });
	}

	/**
	 * Refreshes SSL validation for a custom hostname.
	 * This can be called to retry validation after the user has added DNS records.
	 *
	 * @param hostnameId - The Cloudflare custom hostname ID
	 * @returns The updated custom hostname
	 */
	async refreshCustomHostname(hostnameId: string): Promise<ICloudflareCustomHostname> {
		this.logger.info('cloudflare.customHostname.refresh', { hostnameId });

		// Return mock response in test environment
		if (this.isTestEnvironment) {
			const mockResult = this.mockCustomHostname('test.example.com', hostnameId);
			this.logger.debug('cloudflare.customHostname.mock.refresh', { hostnameId });
			return mockResult;
		}

		const result = await this.request<ICloudflareCustomHostname>(
			'PATCH',
			`/zones/${this.zoneId}/custom_hostnames/${hostnameId}`,
			{
				ssl: {
					method: 'txt',
					type: 'dv',
				},
			},
		);

		this.logger.info('cloudflare.customHostname.refreshed', {
			hostnameId,
			sslStatus: result.ssl.status,
		});

		return result;
	}
}
