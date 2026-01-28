import { NotFoundError } from '@/core/error/http';

export class QrCodeShareNotFoundError extends NotFoundError {
	constructor() {
		super('QR Code share link not found.');
	}
}
