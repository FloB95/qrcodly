import { Logger, LogLevel } from "next-axiom";
import { env } from "~/env";
import { type IBaseLogger } from "~/server/application/logger/IBaseLogger";

/**
 * Implementation of the IBaseLogger interface using Pino.
 */
export class AxiomLogger implements IBaseLogger {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({
      logLevel: LogLevel[env.LOG_LEVEL as keyof typeof LogLevel],
      source: "backend-log",
    });
  }

  /**
   * Get the underlying Pino logger instance.
   * @returns The Pino logger instance.
   */
  getLoggerInstance(): Logger {
    return this.logger;
  }

  /**
   * Log a debug message.
   * @param message The message to log.
   * @param obj Additional data to log.
   */
  debug(message: string, obj?: object): void {
    this.logger.debug(message, obj);
  }

  /**
   * Log an info message.
   * @param message The message to log.
   * @param obj Additional data to log.
   */
  info(message: string, obj?: object): void {
    this.logger.info(message, obj);
  }

  /**
   * Log a warning message.
   * @param message The message to log.
   * @param obj Additional data to log.
   */
  warn(message: string, obj?: object): void {
    this.logger.warn(message, obj);
  }

  /**
   * Log an error message.
   * @param message The message to log.
   * @param obj Additional data to log.
   */
  error(message: string, obj?: object): void {
    this.logger.error(message, obj);
  }
}
