import { CustomApiError } from './CustomApiError'

export class UnauthenticatedError extends CustomApiError {
  constructor(message: string) {
    super(message, 401)
  }
}
