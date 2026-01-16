import { type TCreateCustomDomainDto } from '@shared/schemas';

/**
 * Generates a valid CreateCustomDomainDto for testing.
 */
export function generateCreateCustomDomainDto(
	overrides?: Partial<TCreateCustomDomainDto>,
): TCreateCustomDomainDto {
	return {
		domain: `test-${Date.now()}.example.com`,
		...overrides,
	};
}
