import { z } from 'zod';

/**
 * SSL status values from Cloudflare Custom Hostnames API.
 */
export const CloudflareSSLStatusSchema = z.enum([
	'initializing',
	'pending_validation',
	'pending_issuance',
	'pending_deployment',
	'active',
	'pending_expiration',
	'expired',
	'deleted',
	'validation_timed_out',
]);

export type TCloudflareSSLStatus = z.infer<typeof CloudflareSSLStatusSchema>;

/**
 * SSL status groups for UI display.
 */
export const SSL_STATUS_GROUPS = {
	pending: [
		'initializing',
		'pending_validation',
		'pending_issuance',
		'pending_deployment',
	] as const,
	active: ['active'] as const,
	expired: ['pending_expiration', 'expired'] as const,
	error: ['deleted', 'validation_timed_out'] as const,
} as const;

/**
 * Helper to check if SSL status is in a pending state.
 */
export function isSslPending(status: TCloudflareSSLStatus): boolean {
	return (SSL_STATUS_GROUPS.pending as readonly string[]).includes(status);
}

/**
 * Helper to check if SSL status is active.
 */
export function isSslActive(status: TCloudflareSSLStatus): boolean {
	return status === 'active';
}

/**
 * Helper to check if SSL status is in an error state.
 */
export function isSslError(status: TCloudflareSSLStatus): boolean {
	return (SSL_STATUS_GROUPS.error as readonly string[]).includes(status);
}
