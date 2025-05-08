import { BadRequestError, CustomApiError } from '@/core/error/http';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { ZodError } from 'zod';

export default abstract class AbstractController {
	/**
	 * Creates an HTTP response object.
	 * @param statusCode The status code of the response.
	 * @param data The data to be included in the response.
	 * @param additionalHeaders Additional headers to be included in the response.
	 * @returns An HTTP response object.
	 */
	protected makeApiHttpResponse<T>(
		statusCode: number,
		data: T,
		additionalHeaders: Record<string, never> = {},
	): IHttpResponse<T> {
		return {
			statusCode,
			data,
			headers: {
				'Content-Type': 'application/json',
				...additionalHeaders,
			},
		};
	}
}
