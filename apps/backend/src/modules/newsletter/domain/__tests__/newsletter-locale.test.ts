import { localeAttribs, signUpLocale, storedLocale } from '../newsletter-locale';

describe('newsletter locale', () => {
	it.each([
		['de', 'de'],
		['en', 'en'],
		['fr', 'en'],
		['de-DE', 'en'],
		[undefined, 'en'],
		[42, 'en'],
	])('maps the sign-up page language %p to %p', (pageLocale, expected) => {
		expect(signUpLocale(pageLocale)).toBe(expected);
	});

	it('stores the language with its source', () => {
		expect(localeAttribs('de', 'user')).toEqual({ locale: 'de', locale_source: 'user' });
	});

	it('reads the stored language, English when none or an unknown one is stored', () => {
		expect(storedLocale({ locale: 'de', locale_source: 'auto' })).toBe('de');
		expect(storedLocale({ locale: 'en', locale_source: 'user' })).toBe('en');
		expect(storedLocale({ locale: 'fr' })).toBe('en');
		expect(storedLocale({})).toBe('en');
		expect(storedLocale(undefined)).toBe('en');
	});
});
