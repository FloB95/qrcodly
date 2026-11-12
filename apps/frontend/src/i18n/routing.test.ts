import { describe, expect, it } from 'vitest';
import { signInPath, signUpPath } from './routing';

describe('signInPath', () => {
	it('has no prefix for the default locale', () => {
		expect(signInPath('en')).toBe('/sign-in');
	});

	it('prefixes every other supported locale', () => {
		expect(signInPath('de')).toBe('/de/sign-in');
		expect(signInPath('pt')).toBe('/pt/sign-in');
	});

	// the proxy passes the first path segment, which is no locale on unprefixed routes
	it('falls back to the unprefixed page for anything that is no locale', () => {
		expect(signInPath('dashboard')).toBe('/sign-in');
		expect(signInPath('')).toBe('/sign-in');
		expect(signInPath(undefined)).toBe('/sign-in');
	});
});

describe('signUpPath', () => {
	it('follows the same locale rules as signInPath', () => {
		expect(signUpPath('en')).toBe('/sign-up');
		expect(signUpPath('de')).toBe('/de/sign-up');
		expect(signUpPath('dashboard')).toBe('/sign-up');
		expect(signUpPath(undefined)).toBe('/sign-up');
	});
});
