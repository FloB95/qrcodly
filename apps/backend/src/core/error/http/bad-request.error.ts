import { z } from 'zod';
import { CustomApiError } from './custom-api.error';
import { fromError, createErrorMap } from 'zod-validation-error';
import { type $ZodError } from 'zod/v4/core';

z.config({
	customError: createErrorMap(),
});

/**
 * Represents a BadRequestError, which is an extension of CustomApiError.
 */
export class BadRequestError extends CustomApiError {
	/**
	 * A captured zod error when parsing schemas
	 */
	zodError?: $ZodError;

	/**
	 * Creates an instance of BadRequestError.
	 * @param message The error message.
	 * @param zodError An optional ZodError object representing validation errors.
	 */
	constructor(message: string, zodError?: $ZodError) {
		super(message, 400);

		if (zodError) {
			const validationError = fromError(zodError, {
				prefix: null,
			});

			this.message +=
				(this.message[this.message.length - 1] !== '.' ? '. ' : ' ') + validationError.toString();
		}

		this.zodError = zodError;
	}
}
