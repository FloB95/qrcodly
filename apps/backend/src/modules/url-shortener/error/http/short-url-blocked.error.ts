import { ForbiddenError } from '@/core/error/http';

/**
 * Raised whenever someone tries to re-enable — or duplicate — a link we blocked for safety.
 *
 * 403 rather than 400: the request is well-formed, the caller simply is not allowed to undo a block.
 */
export class ShortUrlBlockedError extends ForbiddenError {
	public readonly errorCode = 'SHORT_URL_BLOCKED' as const;

	constructor() {
		super(
			'This short URL was blocked because its destination was flagged as unsafe and cannot be re-enabled.',
		);
	}
}
