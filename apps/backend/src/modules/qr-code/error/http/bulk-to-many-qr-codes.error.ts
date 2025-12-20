import { BadRequestError } from '@/core/error/http';

export class BulkToManyQrCodesError extends BadRequestError {
	constructor(qrCodeCount: number, limit: number) {
		super(`Too many qrcodes in csv file (${qrCodeCount}) max: ${limit}`);
	}
}
