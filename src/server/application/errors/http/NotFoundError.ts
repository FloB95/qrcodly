import { CustomApiError } from './CustomApiError'

export class NotFoundError extends CustomApiError {
  constructor(message: string) {
    super(message, 404)
  }
}
