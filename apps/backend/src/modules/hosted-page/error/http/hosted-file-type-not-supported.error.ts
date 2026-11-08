import { BadRequestError } from '@/core/error/http';

export class HostedFileTypeNotSupportedError extends BadRequestError {
	public readonly errorCode = 'HOSTED_FILE_TYPE_NOT_SUPPORTED' as const;

	constructor(kind: string) {
		super(
			kind === 'pdf'
				? 'Only PDF documents are supported for hosted PDF pages.'
				: 'Only PNG, JPEG and WebP images are supported.',
		);
	}
}
