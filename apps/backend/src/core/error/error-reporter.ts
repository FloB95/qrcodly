import { singleton } from 'tsyringe';
import { env } from '../config/env';
import { OnShutdown } from '../decorators/on-shutdown.decorator';
import {
	init,
	type Breadcrumb,
	type NodeClient,
	captureException,
	isInitialized,
	consoleLoggingIntegration,
} from '@sentry/node';
import { IN_PRODUCTION } from '../config/constants';

const originOf = (url: unknown): string | null => {
	try {
		return typeof url === 'string' ? new URL(url).origin : null;
	} catch {
		return null;
	}
};

/** listmonk lookups carry the email address in the query string, which fetch breadcrumbs record */
export const redactListmonkBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => {
	const listmonkOrigin = originOf(env.LISTMONK_URL);
	if (!breadcrumb.data || !listmonkOrigin || originOf(breadcrumb.data.url) !== listmonkOrigin) {
		return breadcrumb;
	}
	const { 'http.query': _query, ...data } = breadcrumb.data;
	return { ...breadcrumb, data };
};

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
		this.client = init({
			enabled: IN_PRODUCTION,
			dsn: env.SENTRY_DSN,
			profileSessionSampleRate: 1.0,
			environment: env.SENTRY_ENVIRONMENT,
			enableLogs: true,
			integrations: [consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })],
			beforeBreadcrumb: redactListmonkBreadcrumb,
		});
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
