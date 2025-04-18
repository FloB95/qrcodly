import { HttpHeader } from 'fastify/types/utils';

/**
 * Interface representing an HTTP response.
 * @interface
 */
export interface IHttpResponse<T = unknown> {
	/**
	 * The status code of the HTTP response.
	 * @type {number}
	 */
	statusCode: number;

	/**
	 * The data returned in the HTTP response.
	 * @type {T}
	 */
	data: T;

	/**
	 * The headers returned in the HTTP response.
	 * @type {{ [key: string]: unknown }}
	 */
	headers: Partial<Record<HttpHeader, number | string | string[] | undefined>>;
}
