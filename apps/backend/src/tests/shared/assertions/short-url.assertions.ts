import type { TShortUrlResponseDto } from '@shared/schemas';

/**
 * Asserts that a short URL response has the expected structure.
 */
export const assertShortUrlResponse = (
	response: TShortUrlResponseDto,
	expectedCreatedBy: string | null,
) => {
	expect(response.id).toEqual(expect.any(String));
	expect(response.shortCode).toEqual(expect.any(String));
	expect(response.shortCode).toHaveLength(5);
	expect(response.createdAt).toEqual(expect.any(String));
	// updatedAt can be null for newly created records
	expect(['string', 'object']).toContain(typeof response.updatedAt);
	expect(response.createdBy).toBe(expectedCreatedBy);
	expect(typeof response.isActive).toBe('boolean');

	if (response.destinationUrl !== null) {
		expect(response.destinationUrl).toEqual(expect.any(String));
	}

	if (response.qrCodeId !== null) {
		expect(response.qrCodeId).toEqual(expect.any(String));
	}
};

/**
 * Asserts that a short URL is reserved (no destination, inactive).
 */
export const assertReservedShortUrl = (response: TShortUrlResponseDto) => {
	expect(response.destinationUrl).toBeNull();
	expect(response.qrCodeId).toBeNull();
	expect(response.isActive).toBe(false);
};

/**
 * Asserts that a short URL is linked to a QR code.
 */
export const assertLinkedShortUrl = (response: TShortUrlResponseDto, qrCodeId: string) => {
	expect(response.qrCodeId).toBe(qrCodeId);
	expect(response.destinationUrl).toBeTruthy();
	expect(response.isActive).toBe(true);
};
