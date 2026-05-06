import { type ApiKeyScope } from '@shared/schemas';
import { ForbiddenError } from './forbidden.error';

export class InsufficientScopeError extends ForbiddenError {
	public readonly errorCode = 'INSUFFICIENT_SCOPE' as const;
	public readonly requiredScope: ApiKeyScope;
	public readonly grantedScopes: string[];

	constructor(requiredScope: ApiKeyScope, grantedScopes: string[]) {
		super(
			`Insufficient API key scope. This endpoint requires "${requiredScope}", but the key only has [${grantedScopes.join(', ') || 'none'}].`,
		);
		this.requiredScope = requiredScope;
		this.grantedScopes = grantedScopes;
	}
}
