import { isSelfReferencingShortUrl } from '../index';

// Control both recognized system hosts so we can assert the redirect-domain split behaviour.
jest.mock('@/core/config/env', () => ({
	env: {
		FRONTEND_URL: 'https://www.qrcodly.de',
		SHORT_URL_BASE_URL: 'https://qrco.ly',
	},
}));

describe('isSelfReferencingShortUrl', () => {
	const code = 'abc12';

	it('matches the dedicated redirect domain', () => {
		expect(isSelfReferencingShortUrl('https://qrco.ly/u/abc12', code)).toBe(true);
	});

	it('matches the legacy brand domain (regression: old-domain self-reference)', () => {
		expect(isSelfReferencingShortUrl('https://www.qrcodly.de/u/abc12', code)).toBe(true);
		expect(isSelfReferencingShortUrl('https://qrcodly.de/u/abc12', code)).toBe(true);
	});

	it('matches a provided custom-domain host', () => {
		expect(
			isSelfReferencingShortUrl('https://links.acme.com/u/abc12', code, 'links.acme.com'),
		).toBe(true);
	});

	it('ignores a different short code on a recognized host', () => {
		expect(isSelfReferencingShortUrl('https://qrco.ly/u/other', code)).toBe(false);
	});

	it('ignores an unrecognized host', () => {
		expect(isSelfReferencingShortUrl('https://evil.example/u/abc12', code)).toBe(false);
	});

	it('ignores a different path on a recognized host', () => {
		expect(isSelfReferencingShortUrl('https://qrco.ly/pricing', code)).toBe(false);
	});

	it('tolerates a trailing slash', () => {
		expect(isSelfReferencingShortUrl('https://qrco.ly/u/abc12/', code)).toBe(true);
	});

	it('returns false for empty or unparseable input', () => {
		expect(isSelfReferencingShortUrl(null, code)).toBe(false);
		expect(isSelfReferencingShortUrl(undefined, code)).toBe(false);
		expect(isSelfReferencingShortUrl('not-a-url', code)).toBe(false);
	});
});
