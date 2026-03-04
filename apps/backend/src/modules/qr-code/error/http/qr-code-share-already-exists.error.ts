import { BadRequestError } from '@/core/error/http';

export class QrCodeShareAlreadyExistsError extends BadRequestError {
	constructor() {
		super('A share link already exists for this QR code. Delete it first to create a new one.');
	}
}
