import { CustomApiError } from './CustomApiError'

export class UnauthorizedError extends CustomApiError {
  constructor(message: string) {
    super(message, 403)
  }
}
