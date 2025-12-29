import { BadRequestError } from '@/core/error/http';

export class BulkContentTypeNotSupported extends BadRequestError {
	constructor(contentType: string) {
		super(`Bulk import not supported for content type "${contentType}"`);
	}
}
