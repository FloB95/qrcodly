import { singleton } from 'tsyringe';
import { env } from '../config/env';
import { OnShutdown } from '../decorators/OnShutdown';
import { init, type NodeClient, captureException, isInitialized } from '@sentry/node';

export type TErrorLevel = 'fatal' | 'error' | 'warning' | 'info';

export type TReportingOptions = {
	level?: TErrorLevel;
};

/**
 * AppCache class for caching data using Redis.
 */
@singleton()
export class ErrorReporter {
	private client: NodeClient | undefined;

	constructor() {
		if (env.SENTRY_DSN) {
			this.client = init({
				dsn: env.SENTRY_DSN,
				// Set sampling rate for profiling - this is evaluated only once per SDK.init
				profileSessionSampleRate: 1.0,
			});
		}
	}

	private report(error: Error | string, options?: TReportingOptions) {
		if (!this.client || !isInitialized()) return;

		return captureException(error, options);
	}

	error(e: Error, options?: TReportingOptions) {
		this.report(e, options);
	}

	@OnShutdown()
	onShutdown() {
		this.client?.close();
	}
}
