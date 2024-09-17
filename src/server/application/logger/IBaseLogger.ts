/**
 * Represents a base logger.
 */
export interface IBaseLogger {
  /**
   * Logs a debug message.
   * @param {string} message - The message to log.
   * @param {object} [obj] - Additional data to log.
   */
  debug: (message: string, obj?: object) => void

  /**
   * Logs an info message.
   * @param {string} message - The message to log.
   * @param {object} [obj] - Additional data to log.
   */
  info: (message: string, obj?: object) => void

  /**
   * Logs a warning message.
   * @param {string} message - The message to log.
   * @param {object} [obj] - Additional data to log.
   */
  warn: (message: string, obj?: object) => void

  /**
   * Logs an error message.
   * @param {string} message - The message to log.
   * @param {object} [obj] - Additional data to log.
   */
  error: (message: string, obj?: object) => void

  /**
   * Gets the logger instance.
   * @returns {any} The logger instance.
   */
  getLoggerInstance: () => any
}
