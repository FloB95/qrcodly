import { BadRequestError } from '@/core/error/http';

export class BulkTooManyQrCodesError extends BadRequestError {
	constructor(qrCodeCount: number, limit: number, plan: string) {
		super(
			`Cannot import ${qrCodeCount} rows. Maximum allowed is ${limit} rows for your ${plan} plan. `,
		);
	}
}
