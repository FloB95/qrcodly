import { CustomApiError } from "./CustomApiError";

export class TooManyRequestsError extends CustomApiError {
  constructor(message?: string) {
    super(message ?? "Too many requests", 429);
  }
}
