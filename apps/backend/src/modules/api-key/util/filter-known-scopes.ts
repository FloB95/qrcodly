import { API_KEY_SCOPES, type ApiKeyScope } from '@shared/schemas';

/**
 * Filters Clerk's raw `string[]` scope output down to scopes we know about,
 * so the response DTO is strictly typed and forward-compatible if Clerk ever
 * surfaces additional scopes we don't recognize.
 */
export function filterKnownScopes(scopes: string[] | null | undefined): ApiKeyScope[] {
	if (!scopes || scopes.length === 0) return [];
	return scopes.filter((s): s is ApiKeyScope => (API_KEY_SCOPES as readonly string[]).includes(s));
}
