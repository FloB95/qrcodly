import { NotFoundError } from '@/core/error/http';

export class ScanIpExclusionNotFoundError extends NotFoundError {
	constructor() {
		super('Excluded IP range with the provided ID could not be found.');
	}
}
