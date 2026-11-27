import { z } from 'zod';
import { ShortCodeSchema } from '../../schemas/ShortUrl';
import { SHORT_URL_ALIAS_MAX_LENGTH, ShortUrlAliasSchema } from '../../schemas/ShortUrlAlias';

/** Sets the alias of a short URL, replacing the one it has. `null` removes it. */
export const SetShortUrlAliasDto = z.object({
	alias: ShortUrlAliasSchema.nullable(),
});
export type TSetShortUrlAliasDto = z.infer<typeof SetShortUrlAliasDto>;

export const ShortUrlAliasAvailabilityQueryDto = z.object({
	customDomainId: z.uuid().describe('The custom domain the alias would live on'),
	alias: ShortUrlAliasSchema,
});
export type TShortUrlAliasAvailabilityQueryDto = z.infer<typeof ShortUrlAliasAvailabilityQueryDto>;

/** What keeps an alias from being used. */
export enum ShortUrlAliasConflict {
	/** Another short URL on the same custom domain already has it. */
	TAKEN = 'taken',
	/** It equals a short code: short codes and aliases share the `/u/` path. */
	MATCHES_SHORT_CODE = 'matches_short_code',
}
export const ShortUrlAliasConflictSchema = z.enum(ShortUrlAliasConflict);

/** The `errorCode` of an API error that refuses an alias. */
export enum ShortUrlAliasErrorCode {
	TAKEN = 'SHORT_URL_ALIAS_TAKEN',
	MATCHES_SHORT_CODE = 'SHORT_URL_ALIAS_MATCHES_SHORT_CODE',
	REQUIRES_CUSTOM_DOMAIN = 'SHORT_URL_ALIAS_REQUIRES_CUSTOM_DOMAIN',
}

export const ShortUrlAliasAvailabilityResponseDto = z.object({
	available: z.boolean(),
	conflict: ShortUrlAliasConflictSchema.nullable().describe('Why it is not available, or null'),
});
export type TShortUrlAliasAvailabilityResponseDto = z.infer<
	typeof ShortUrlAliasAvailabilityResponseDto
>;

/**
 * Query of the custom domain worker. The alias is taken as it came in the path: one that could
 * never be an alias is simply not found.
 */
export const ResolveShortUrlAliasQueryDto = z.object({
	domain: z.string().min(1).max(255),
	alias: z.string().min(1).max(SHORT_URL_ALIAS_MAX_LENGTH),
});
export type TResolveShortUrlAliasQueryDto = z.infer<typeof ResolveShortUrlAliasQueryDto>;

export const ResolveShortUrlAliasResponseDto = z.object({
	shortCode: ShortCodeSchema,
});
export type TResolveShortUrlAliasResponseDto = z.infer<typeof ResolveShortUrlAliasResponseDto>;
