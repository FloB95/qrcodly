import { type TCreateCustomDomainDto } from '@shared/schemas';
import { type TCustomDomain } from '@/modules/custom-domain/domain/entities/custom-domain.entity';

/**
 * Generates a valid CreateCustomDomainDto for testing.
 * Domain is a subdomain (e.g., links.example.com) to comply with subdomain-only validation.
 */
export function generateCreateCustomDomainDto(
	overrides?: Partial<TCreateCustomDomainDto>,
): TCreateCustomDomainDto {
	return {
		domain: `links-${Date.now()}.example.com`,
		...overrides,
	};
}

/**
 * Generates a mock custom domain entity for testing.
 */
export function generateMockCustomDomain(overrides?: Partial<TCustomDomain>): TCustomDomain {
	const domain = `links-${Date.now()}.example.com`;
	const subdomain = domain.split('.').slice(0, -2).join('.');
	const verificationToken = `test-token-${Date.now()}`;
	return {
		id: `test-domain-${Date.now()}`,
		domain,
		isDefault: false,
		isEnabled: true,
		createdBy: 'test-user-id',
		// Two-phase verification fields
		verificationPhase: 'dns_verification',
		ownershipTxtVerified: false,
		cnameVerified: false,
		// Cloudflare fields
		cloudflareHostnameId: null,
		sslStatus: 'initializing',
		ownershipStatus: 'pending',
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		// Ownership validation TXT record (just subdomain part for display)
		ownershipValidationTxtName: `_qrcodly-verify.${subdomain}`,
		ownershipValidationTxtValue: verificationToken,
		validationErrors: null,
		createdAt: new Date(),
		updatedAt: null,
		...overrides,
	};
}
