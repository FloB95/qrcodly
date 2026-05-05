import { ForbiddenError } from './forbidden.error';

export class TokenTypeNotAllowedError extends ForbiddenError {
	public readonly errorCode = 'TOKEN_TYPE_NOT_ALLOWED' as const;
	public readonly providedTokenType: string;
	public readonly allowedTokenTypes: string[];

	constructor(provided: string, allowed: string[]) {
		super(
			`Authentication type "${provided}" is not allowed for this endpoint. Allowed: [${allowed.join(', ')}].`,
		);
		this.providedTokenType = provided;
		this.allowedTokenTypes = allowed;
	}
}
