import { z } from 'zod';

/**
 * Safety state of a short URL's destination, independent of `isActive`.
 * `blocked` means we disabled the link because Google Web Risk flagged its destination — the owner
 * cannot re-enable it.
 *
 * The matching MySQL enum lives in `@qrcodly/db`. It is intentionally not imported here: the shared
 * package is the API contract layer and does not depend on the database package (same split as the
 * custom-domain SSL/ownership enums).
 */
export const ShortUrlSafetyStatusSchema = z.enum(['unchecked', 'clean', 'blocked']);
export type TShortUrlSafetyStatus = z.infer<typeof ShortUrlSafetyStatusSchema>;

/** Where a malicious verdict came from. */
export const UrlSafetyIncidentSourceSchema = z.enum(['create', 'update', 'duplicate', 'recheck']);
export type TUrlSafetyIncidentSource = z.infer<typeof UrlSafetyIncidentSourceSchema>;

/**
 * What we did about it.
 * - rejected: the write never happened
 * - blocked: an existing link was disabled and locked
 * - shadow: detected while the re-check job runs in shadow mode — recorded, not enforced
 * - cleared: Google delisted the destination and the block was lifted
 */
export const UrlSafetyIncidentActionSchema = z.enum(['rejected', 'blocked', 'shadow', 'cleared']);
export type TUrlSafetyIncidentAction = z.infer<typeof UrlSafetyIncidentActionSchema>;

/**
 * List filter flattening the two independent state axes into one control:
 * `disabled` means the owner switched it off, `blocked` means we did.
 */
export const ShortUrlStatusFilterSchema = z.enum(['all', 'active', 'disabled', 'blocked']);
export type TShortUrlStatusFilter = z.infer<typeof ShortUrlStatusFilterSchema>;
