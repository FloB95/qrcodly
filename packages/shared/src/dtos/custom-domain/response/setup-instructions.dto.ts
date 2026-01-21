import { z } from 'zod';
import { VerificationPhaseSchema } from '../types/verification-phase';

/**
 * DNS record schema for setup instructions.
 */
const DnsRecordSchema = z.object({
	recordType: z.enum(['TXT', 'CNAME']),
	recordHost: z.string(),
	recordValue: z.string(),
});

export type TDnsRecord = z.infer<typeof DnsRecordSchema>;

/**
 * Response DTO for setup instructions (two-phase verification).
 * Provides the DNS records users need to configure.
 */
export const SetupInstructionsResponseDto = z.object({
	phase: VerificationPhaseSchema,
	ownershipValidationRecord: DnsRecordSchema.nullable(),
	cnameRecord: DnsRecordSchema,
	sslValidationRecord: DnsRecordSchema.nullable(),
	ownershipTxtVerified: z.boolean(),
	cnameVerified: z.boolean(),
	instructions: z.string(),
});

export type TSetupInstructionsResponseDto = z.infer<typeof SetupInstructionsResponseDto>;
