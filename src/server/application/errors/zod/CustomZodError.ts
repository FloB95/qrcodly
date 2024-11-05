import { ZodError, type ZodIssue } from 'zod'

/**
 * Represents a CustomZodError, which is an extension of the ZodError class.
 */
export class CustomZodError extends ZodError {
  /**
   * Creates an instance of CustomZodError.
   * @param message The error message.
   * @param path The path to the error.
   */
  constructor(message: string, path: string[]) {
    const issue: ZodIssue = {
      code: 'custom',
      message,
      path,
    }

    super([issue])
  }
}
