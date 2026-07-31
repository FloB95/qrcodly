import { z } from 'zod';
import { UrlSafetyIncidentActionSchema, UrlSafetyIncidentSourceSchema } from './types/safety';

const isoDatetime = z.preprocess((arg) => {
	if (arg instanceof Date) return arg.toISOString();
	return arg;
}, z.iso.datetime());

const nullableIsoDatetime = z
	.preprocess((arg) => {
		if (arg instanceof Date) return arg.toISOString();
		return arg;
	}, z.iso.datetime().nullable())
	.default(null);

/**
 * A single safety finding, as surfaced to the owner.
 *
 * Only the destination *hostname* is ever exposed — paths and query strings can carry secrets or
 * personal data, so a full destination URL is neither stored nor returned.
 */
export const SafetyIncidentResponseDto = z.object({
	id: z.uuid(),
	shortUrlId: z.uuid().nullable().describe('Null when the write was refused and no link exists'),
	shortCode: z
		.string()
		.nullable()
		.default(null)
		.describe('Short code of the affected link, or null'),
	name: z.string().nullable().default(null).describe('User-defined name of the affected link'),
	qrCodeId: z
		.uuid()
		.nullable()
		.default(null)
		.describe('Set when the link belongs to a dynamic QR code, which lives in the QR code list'),
	destinationHost: z.string().describe('Hostname of the flagged destination (never the full URL)'),
	threatTypes: z.string().nullable().default(null),
	source: UrlSafetyIncidentSourceSchema,
	action: UrlSafetyIncidentActionSchema,
	acknowledgedAt: nullableIsoDatetime,
	resolvedAt: nullableIsoDatetime,
	createdAt: isoDatetime,
});
export type TSafetyIncidentResponseDto = z.infer<typeof SafetyIncidentResponseDto>;

/**
 * Everything the dashboard banner needs in one call: the open findings plus whether the account is
 * one offence away from suspension.
 */
export const SafetyIncidentListResponseDto = z.object({
	incidents: SafetyIncidentResponseDto.array().default([]),
	blockedCount: z.number().int().describe('Total blocked links, standalone plus QR-linked'),
	/**
	 * Split because the two live in different lists: the short-URL list is always queried with
	 * standalone=true, so a blocked dynamic-QR link is only findable under QR codes.
	 */
	blockedStandaloneCount: z.number().int().describe('Blocked links shown in the short URL list'),
	blockedQrCodeCount: z.number().int().describe('Blocked links belonging to a dynamic QR code'),
	warningActive: z
		.boolean()
		.describe('True once the account has been warned — the next offence suspends it'),
});
export type TSafetyIncidentListResponseDto = z.infer<typeof SafetyIncidentListResponseDto>;

export const AcknowledgeSafetyIncidentsResponseDto = z.object({
	acknowledged: z.number().int().describe('How many open incidents were marked as seen'),
});
export type TAcknowledgeSafetyIncidentsResponseDto = z.infer<
	typeof AcknowledgeSafetyIncidentsResponseDto
>;
