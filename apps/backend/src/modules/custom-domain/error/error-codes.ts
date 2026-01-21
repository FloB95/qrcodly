/**
 * Error codes for the Custom Domain module.
 * Used for consistent error identification across the application.
 */
export const CUSTOM_DOMAIN_ERROR_CODES = {
	NOT_FOUND: 'CUSTOM_DOMAIN_NOT_FOUND',
	ALREADY_EXISTS: 'DOMAIN_ALREADY_EXISTS',
	VERIFICATION_FAILED: 'DOMAIN_VERIFICATION_FAILED',
	SSL_NOT_ACTIVE: 'DOMAIN_SSL_NOT_ACTIVE',
	NOT_VERIFIED: 'DOMAIN_NOT_VERIFIED',
} as const;

export type TCustomDomainErrorCode =
	(typeof CUSTOM_DOMAIN_ERROR_CODES)[keyof typeof CUSTOM_DOMAIN_ERROR_CODES];
