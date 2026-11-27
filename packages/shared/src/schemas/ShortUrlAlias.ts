import { z } from 'zod';

export const SHORT_URL_ALIAS_MIN_LENGTH = 3;
export const SHORT_URL_ALIAS_MAX_LENGTH = 80;

/** Lowercase letters and digits, with single hyphens only between them. */
export const SHORT_URL_ALIAS_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The readable second address of a short URL on its custom domain. Upper case is accepted and
 * stored in lower case, because an alias is typed by people and addresses are matched in lower case.
 */
export const ShortUrlAliasSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(SHORT_URL_ALIAS_MIN_LENGTH)
	.max(SHORT_URL_ALIAS_MAX_LENGTH)
	.regex(
		SHORT_URL_ALIAS_PATTERN,
		'Only lowercase letters, digits and single hyphens between them are allowed',
	)
	.describe('Readable alias of a short URL on its custom domain (e.g. "summer-party-2026")');

export type TShortUrlAliasValue = z.infer<typeof ShortUrlAliasSchema>;
