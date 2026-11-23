import { ConflictError } from '@/core/error/http';

export class ScanIpExclusionAlreadyExistsError extends ConflictError {
	constructor() {
		super('This IP address or range is already excluded.');
	}
}
