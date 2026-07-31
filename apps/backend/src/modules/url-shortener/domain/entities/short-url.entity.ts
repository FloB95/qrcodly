import { shortUrl, type TShortUrl } from '@qrcodly/db';

// The safety enum is deliberately not re-exported here — use TShortUrlSafetyStatus from
// @shared/schemas so the API contract stays the single definition consumed by both apps.
export {
	shortUrlRelations,
	type TShortUrl,
	type TShortUrlWithDomain,
	type TShortUrlWithDomainAndTags,
} from '@qrcodly/db';

/** Columns the safety subsystem owns. Callers creating a short URL must never supply them. */
export type TShortUrlSafetyColumns =
	| 'safetyStatus'
	| 'safetyBlockedAt'
	| 'safetyThreatTypes'
	| 'lastSafetyCheckAt'
	| 'nextSafetyCheckAt'
	| 'safetyCheckFailures'
	| 'safetyPendingSince';

/**
 * What a caller has to provide to create a short URL. Timestamps and every safety column are
 * derived inside the repository, so a new call site cannot forget to enrol the link in the
 * re-check queue.
 */
export type TShortUrlCreateInput = Omit<
	TShortUrl,
	'createdAt' | 'updatedAt' | TShortUrlSafetyColumns
>;

/** Safety column defaults, matching the DB defaults. Useful for test fixtures. */
export const SHORT_URL_SAFETY_DEFAULTS = {
	safetyStatus: 'unchecked',
	safetyBlockedAt: null,
	safetyThreatTypes: null,
	lastSafetyCheckAt: null,
	nextSafetyCheckAt: null,
	safetyCheckFailures: 0,
	safetyPendingSince: null,
} as const satisfies Pick<TShortUrl, TShortUrlSafetyColumns>;

export default shortUrl;
