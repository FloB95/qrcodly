import pino, { type Logger as PinoLogger } from 'pino';
import { singleton } from 'tsyringe';
import { env } from '@/core/config/env';
import { type ILogger } from '../interface/logger.interface';
import { LOGGER_REDACT_PATHS } from '../config/constants';

/**
 * Implementation of the ILogger interface using Pino.
 */
@singleton()
export class Logger implements ILogger {
	private logger: PinoLogger;

	constructor() {
		const pinoPrettyTransport = {
			target: 'pino-pretty',
			level: env.LOG_LEVEL,
		};

		const transports = {
			targets: [pinoPrettyTransport],
		};

		if (env.AXIOM_DATASET && env.AXIOM_TOKEN) {
			const axiomTransport = {
				target: '@axiomhq/pino',
				level: env.LOG_LEVEL,
				options: {
					dataset: process.env.AXIOM_DATASET,
					token: process.env.AXIOM_TOKEN,
				},
			};

			transports.targets.push(axiomTransport);
		}

		this.logger = pino({
			level: env.LOG_LEVEL,
			transport: transports,
			name: 'backend-log',
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
	}

	info(message: string, obj?: object): void {
		this.logger.info(obj, message);
	}

	warn(message: string, obj?: object): void {
		this.logger.warn(obj, message);
	}

	error(message: string, obj?: object): void {
		this.logger.error(obj, message);
	}

	fatal(message: string, obj?: object): void {
		this.logger.fatal(obj, message);
	}
}
