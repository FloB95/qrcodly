import { z } from 'zod';
import { HostedUploadKindSchema } from '../../schemas/HostedPage';

const UsageCounterSchema = z.object({
	used: z.number().int().describe('Taken by the user'),
	limit: z.number().int().describe('Allowed by the plan'),
	remaining: z.number().int().describe('Still available'),
});

export const HostedPageUsageRequestQueryDto = z.object({
	excludeQrCodeId: z
		.uuid()
		.optional()
		.describe(
			'Leave this QR code out of the count, e.g. the one being edited, to add its new content yourself',
		),
});
export type THostedPageUsageRequestQueryDto = z.infer<typeof HostedPageUsageRequestQueryDto>;

/**
 * What the caller's hosted QR codes take from the plan, and the upload limits of the plan. A code
 * that opens its file directly takes no landing page; every stored file counts.
 */
export const HostedPageUsageResponseDto = z.object({
	plan: z.enum(['free', 'pro']).describe('Plan the limits below belong to'),
	landingPages: UsageCounterSchema.describe(
		'QR codes whose scan shows a landing page; codes that open a file directly do not count',
	),
	files: UsageCounterSchema.describe(
		'Stored files of every kind (documents, cover and logo images) across all hosted QR codes. The limit includes extra files granted on request',
	),
	maxFileSizeBytes: z
		.record(HostedUploadKindSchema, z.number().int())
		.describe('Largest file per kind the plan accepts'),
});
export type THostedPageUsageResponseDto = z.infer<typeof HostedPageUsageResponseDto>;
