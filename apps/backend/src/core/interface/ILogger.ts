/**
 * Represents a logger.
 */
export interface ILogger {
	/**
	 * Logs a debug message.
	 * @param {string} message - The message to log.
	 * @param {object} [obj] - Additional data to log.
	 */
	debug: (message: string, obj?: object) => void;

	/**
	 * Logs an info message.
	 * @param {string} message - The message to log.
	 * @param {object} [obj] - Additional data to log.
	 */
	info: (message: string, obj?: object) => void;

	/**
	 * Logs a warning message.
	 * @param {string} message - The message to log.
	 * @param {object} [obj] - Additional data to log.
	 */
	warn: (message: string, obj?: object) => void;

	/**
	 * Logs an error message.
	 * @param {string} message - The message to log.
	 * @param {object} [obj] - Additional data to log.
	 */
	error: (message: string, obj?: object) => void;

	/**
	 * Logs a fatal error message.
	 * @param {string} message - The message to log.
	 * @param {object} [obj] - Additional data to log.
	 */
	fatal: (message: string, obj?: object) => void;

	/**
	 * Gets the logger instance.
	 * @returns {unknown} The logger instance.
	 */
	getLoggerInstance: () => unknown;
}
