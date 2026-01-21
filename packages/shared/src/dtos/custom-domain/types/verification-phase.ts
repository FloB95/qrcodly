import { z } from 'zod';

/**
 * Verification phase for the two-step verification flow.
 * - dns_verification: User needs to add ownership TXT + CNAME records
 * - cloudflare_ssl: DNS verified, waiting for Cloudflare SSL provisioning
 */
export const VerificationPhaseSchema = z.enum(['dns_verification', 'cloudflare_ssl']);

export type TVerificationPhase = z.infer<typeof VerificationPhaseSchema>;

/**
 * Display labels for verification phases.
 */
export const VERIFICATION_PHASE_LABELS: Record<TVerificationPhase, string> = {
	dns_verification: 'DNS Verification',
	cloudflare_ssl: 'SSL Provisioning',
};
