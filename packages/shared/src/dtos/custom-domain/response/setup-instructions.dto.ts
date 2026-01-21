import { z } from 'zod';
import { VerificationPhaseSchema } from '../types/verification-phase';

/**
 * TXT DNS record schema.
 */
const TxtRecordSchema = z.object({
	recordType: z.literal('TXT'),
	recordHost: z.string(),
	recordValue: z.string(),
});

/**
 * CNAME DNS record schema.
 */
const CnameRecordSchema = z.object({
	recordType: z.literal('CNAME'),
	recordHost: z.string(),
	recordValue: z.string(),
});

export type TTxtRecord = z.infer<typeof TxtRecordSchema>;
export type TCnameRecord = z.infer<typeof CnameRecordSchema>;

/**
 * Response DTO for setup instructions (two-phase verification).
 * Provides the DNS records users need to configure.
 */
export const SetupInstructionsResponseDto = z.object({
	phase: VerificationPhaseSchema,
	ownershipValidationRecord: TxtRecordSchema.nullable(),
	cnameRecord: CnameRecordSchema,
	dcvDelegationRecord: CnameRecordSchema,
	sslValidationRecord: TxtRecordSchema.nullable(),
	ownershipTxtVerified: z.boolean(),
	cnameVerified: z.boolean(),
	dcvDelegationVerified: z.boolean(),
	instructions: z.string(),
});

export type TSetupInstructionsResponseDto = z.infer<typeof SetupInstructionsResponseDto>;
