import { container } from 'tsyringe';
import { CustomApiError } from './custom-api.error';
import { Logger } from '@/core/logging';
import { ErrorReporter } from '../error-reporter';

export class UnhandledServerError extends CustomApiError {
	constructor(error: Error, message = 'An unhandled error occurred') {
		super(message, 500);

		const logger = container.resolve(Logger);
		logger.error(message, error);

		container.resolve(ErrorReporter).error(error, {
			level: 'error',
		});
	}
}
