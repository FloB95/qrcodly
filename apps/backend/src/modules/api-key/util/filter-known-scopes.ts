import { API_KEY_SCOPES, type ApiKeyScope } from '@shared/schemas';

/** Narrow Clerk's raw `string[]` scopes down to known values for strict response typing. */
export function filterKnownScopes(scopes: string[] | null | undefined): ApiKeyScope[] {
	if (!scopes || scopes.length === 0) return [];
	return scopes.filter((s): s is ApiKeyScope => (API_KEY_SCOPES as readonly string[]).includes(s));
}
