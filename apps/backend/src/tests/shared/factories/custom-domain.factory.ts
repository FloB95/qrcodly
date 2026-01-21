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
	return {
		id: `test-domain-${Date.now()}`,
		domain: `links-${Date.now()}.example.com`,
		isDefault: false,
		isEnabled: true,
		createdBy: 'test-user-id',
		cloudflareHostnameId: null,
		sslStatus: 'pending',
		ownershipStatus: 'pending',
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		ownershipValidationTxtName: null,
		ownershipValidationTxtValue: null,
		validationErrors: null,
		createdAt: new Date(),
		updatedAt: null,
		...overrides,
	};
}
