/**
 * Represents a CustomApiError, which is an extension of the Error class.
 */
export class CustomApiError extends Error {
  /**
   * The http status code.
   */
  statusCode: number

  /**
   * Creates an instance of CustomApiError.
   * @param message The error message.
   * @param code The http status code.
   */
  constructor(message: string, code: number) {
    super(message)
    this.statusCode = code
  }
}
