import { BadRequestError } from '@/core/error/http';

export class QrCodeContentTypeChangeError extends BadRequestError {
	constructor() {
		super('You cannot change the content type of an existing QR code.');
	}
}
