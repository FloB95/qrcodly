import { BadRequestError, CustomApiError } from '@/core/error/http';
import { UnhandledServerError } from '@/core/error/http/UnhandledServerError';
import { type IHttpResponse } from '@/core/interface/IResponse';
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

	/**
	 * Handles an error and throws a custom API error.
	 * @param error The error to handle.
	 * @throws {CustomApiError} If the error is a custom API error.
	 * @throws {BadRequestError} If the error is a Zod error.
	 * @throws {UnhandledServerError} If the error is not a custom API or Zod error.
	 */
	protected handleError(error: Error): never {
		if (error instanceof CustomApiError) {
			throw error;
		}

		if (error instanceof ZodError) {
			throw new BadRequestError(error.message, error.issues);
		}

		throw new UnhandledServerError(error);
	}
}
