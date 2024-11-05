import { type ZodError, type typeToFlattenedError } from "zod";
import { CustomApiError } from "./CustomApiError";

/**
 * Represents a BadRequestError, which is an extension of CustomApiError.
 */
export class BadRequestError extends CustomApiError {
  /**
   * An object where keys are field names and values are arrays of error messages.
   */
  fieldErrors?: typeToFlattenedError<any, string>["fieldErrors"]; // Use the correct type from Zod

  /**
   * Creates an instance of BadRequestError.
   * @param message The error message.
   * @param zodError An instance of ZodError representing the validation errors.
   */
  constructor(message: string, zodError?: ZodError) {
    if (zodError) {
      message =
        "Your request has invalid fields, please fix them and try again.";
    }

    super(message, 400);

    // Assign the flattened Zod errors if provided
    this.fieldErrors = zodError ? zodError.flatten().fieldErrors : undefined;
  }
}
