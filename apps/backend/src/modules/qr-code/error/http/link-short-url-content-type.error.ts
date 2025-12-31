import { BadRequestError } from '@/core/error/http';

export class LinkShortUrlContentTypeError extends BadRequestError {
	constructor(contentType: string) {
		super(`Invalid QR code content type to generate a short URL. Received type "${contentType}"`);
	}
}
