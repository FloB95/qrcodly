import { isShortenedDestinationUrl } from '../index';

// Control both recognized system hosts so we can assert the redirect-domain split behaviour.
jest.mock('@/core/config/env', () => ({
	env: {
		FRONTEND_URL: 'https://www.qrcodly.de',
		SHORT_URL_BASE_URL: 'https://qrco.ly',
	},
}));

describe('isShortenedDestinationUrl', () => {
	it('matches the dedicated redirect domain', () => {
		expect(isShortenedDestinationUrl('https://qrco.ly/u/abc12')).toBe(true);
	});

	it('matches the legacy brand domain (regression: old-domain self-reference)', () => {
		expect(isShortenedDestinationUrl('https://www.qrcodly.de/u/abc12')).toBe(true);
		expect(isShortenedDestinationUrl('https://qrcodly.de/u/abc12')).toBe(true);
	});

	it('matches a provided custom-domain host', () => {
		expect(isShortenedDestinationUrl('https://links.acme.com/u/abc12', 'links.acme.com')).toBe(
			true,
		);
	});

	it('matches a different short code on a recognized host (chaining, not just self-reference)', () => {
		expect(isShortenedDestinationUrl('https://qrco.ly/u/other')).toBe(true);
	});

	it('ignores an unrecognized host', () => {
		expect(isShortenedDestinationUrl('https://evil.example/u/abc12')).toBe(false);
	});

	it('ignores a different path on a recognized host', () => {
		expect(isShortenedDestinationUrl('https://qrco.ly/pricing')).toBe(false);
		expect(isShortenedDestinationUrl('https://qrco.ly/u/abc12/deeper')).toBe(false);
	});

	it('tolerates a trailing slash', () => {
		expect(isShortenedDestinationUrl('https://qrco.ly/u/abc12/')).toBe(true);
	});

	it('returns false for empty or unparseable input', () => {
		expect(isShortenedDestinationUrl(null)).toBe(false);
		expect(isShortenedDestinationUrl(undefined)).toBe(false);
		expect(isShortenedDestinationUrl('not-a-url')).toBe(false);
	});
});
