import { faker } from '@faker-js/faker';
import type { TCreateShortUrlDto, TUpdateShortUrlDto } from '@shared/schemas';

/**
 * Generates a new random short URL creation DTO.
 */
export const generateShortUrlDto = (
	overrides?: Partial<TCreateShortUrlDto>,
): TCreateShortUrlDto => ({
	destinationUrl: faker.internet.url(),
	customDomainId: null,
	isActive: true,
	...overrides,
});

/**
 * Generates a reserved short URL DTO (no destination, inactive).
 */
export const generateReservedShortUrlDto = (): TCreateShortUrlDto => ({
	destinationUrl: null,
	customDomainId: null,
	isActive: false,
});

/**
 * Generates a short URL update DTO.
 */
export const generateUpdateShortUrlDto = (
	overrides?: Partial<TUpdateShortUrlDto>,
): TUpdateShortUrlDto => ({
	destinationUrl: faker.internet.url(),
	isActive: faker.datatype.boolean(),
	...overrides,
});
