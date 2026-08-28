import pino, {
	TransportMultiOptions,
	TransportTargetOptions,
	type Logger as PinoLogger,
} from 'pino';
import { logger as sentryLogger } from '@sentry/node';
import { singleton } from 'tsyringe';
import { env } from '@/core/config/env';
import { type ILogger } from '../interface/logger.interface';
import { IN_TEST, LOGGER_REDACT_PATHS } from '../config/constants';

/**
 * Pino only applies its error serializer to the `err` key, and `message`/`stack` are
 * non-enumerable on Error — so a raw Error logged under `error` would end up as `{}`.
 * Non-Errors pass through untouched: call sites that hand-build an error object would
 * otherwise get their `type` overwritten with "Object".
 */
export const errorSerializer = (error: unknown) =>
	error instanceof Error ? pino.stdSerializers.err(error) : error;

/**
 * Implementation of the ILogger interface using Pino.
 */
@singleton()
export class Logger implements ILogger {
	private logger: PinoLogger;

	constructor() {
		const pinoPrettyTransport: TransportTargetOptions = {
			target: 'pino-pretty',
			level: env.LOG_LEVEL,
		};

		const targets: TransportTargetOptions[] = [pinoPrettyTransport];

		if (env.AXIOM_DATASET && env.AXIOM_TOKEN) {
			const axiomTransport: TransportTargetOptions = {
				target: '@axiomhq/pino',
				level: env.LOG_LEVEL,
				options: {
					dataset: env.AXIOM_DATASET,
					token: env.AXIOM_TOKEN,
				},
			};

			targets.push(axiomTransport);
		}

		const transports: TransportMultiOptions = {
			targets: targets,
		};

		this.logger = pino({
			level: env.LOG_LEVEL,
			transport: transports,
			name: 'backend-log',
			enabled: !IN_TEST,
			serializers: {
				error: errorSerializer,
			},
			redact: {
				paths: LOGGER_REDACT_PATHS,
				censor: '***',
			},
		});
	}

	getLoggerInstance(): PinoLogger {
		return this.logger;
	}

	debug(message: string, obj?: object): void {
		this.logger.debug(obj, message);
		sentryLogger.debug(message, obj as Record<string, unknown>);
	}

	info(message: string, obj?: object): void {
		this.logger.info(obj, message);
		sentryLogger.info(message, obj as Record<string, unknown>);
	}

	warn(message: string, obj?: object): void {
		this.logger.warn(obj, message);
		sentryLogger.warn(message, obj as Record<string, unknown>);
	}

	error(message: string, obj?: object): void {
		this.logger.error(obj, message);
		sentryLogger.error(message, obj as Record<string, unknown>);
	}

	fatal(message: string, obj?: object): void {
		this.logger.fatal(obj, message);
		sentryLogger.fatal(message, obj as Record<string, unknown>);
	}
}
