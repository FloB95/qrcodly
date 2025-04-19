import { NotFoundError } from '@/core/error/http';

export class QrCodeNotFoundError extends NotFoundError {
	constructor() {
		super('QR Code not found.');
	}
}
