import { NotFoundError } from '@/core/error/http'

export class QrCodeNotFoundError extends NotFoundError {
	constructor() {
		super('QrCode not found.');
	}
}
