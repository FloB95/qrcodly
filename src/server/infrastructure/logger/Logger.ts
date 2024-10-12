import { Logger as AxiomLogger, LogLevel as AxiomLogLevel } from "next-axiom";
import pino, { type Logger as PinoLogger } from "pino";
import { env } from "~/env";
import { type IBaseLogger } from "~/server/application/logger/IBaseLogger";

/**
 * Implementation of the IBaseLogger interface using Pino.
 */
export class Logger implements IBaseLogger {
  private axiomLogger: AxiomLogger;
  private pinoLogger: PinoLogger;

  constructor() {
    this.axiomLogger = new AxiomLogger({
      logLevel: AxiomLogLevel[env.LOG_LEVEL as keyof typeof AxiomLogLevel],
      source: "backend-log",
    });

    this.pinoLogger = pino({
      level: env.LOG_LEVEL,
      transport: {
        target: "pino-pretty",
      },
    });
  }

  /**
   * Log a debug message.
   * @param message The message to log.
   * @param obj Additional data to log.
   */
  debug(message: string, obj?: object): void {
    this.axiomLogger.debug(message, obj);
    this.pinoLogger.debug(obj, message);
  }

  /**
   * Log an info message.
   * @param message The message to log.
   * @param obj Additional data to log.
   */
  info(message: string, obj?: object): void {
    this.axiomLogger.info(message, obj);
    this.pinoLogger.info(obj, message);
  }

  /**
   * Log a warning message.
   * @param message The message to log.
   * @param obj Additional data to log.
   */
  warn(message: string, obj?: object): void {
    this.axiomLogger.warn(message, obj);
    this.pinoLogger.warn(obj, message);
  }

  /**
   * Log an error message.
   * @param message The message to log.
   * @param obj Additional data to log.
   */
  error(message: string, obj?: object): void {
    this.axiomLogger.error(message, obj);
    this.pinoLogger.error(obj, message);
  }
}
