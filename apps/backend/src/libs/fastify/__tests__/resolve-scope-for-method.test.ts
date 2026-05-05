import { resolveScopeForMethod } from '../helpers';

describe('resolveScopeForMethod', () => {
	it.each([
		['GET', 'read'],
		['HEAD', 'read'],
		['POST', 'write'],
		['PUT', 'update'],
		['PATCH', 'update'],
		['DELETE', 'delete'],
	])('%s → %s', (method, expected) => {
		expect(resolveScopeForMethod(method)).toBe(expected);
	});

	it('returns null for OPTIONS (CORS preflights have no auth)', () => {
		expect(resolveScopeForMethod('OPTIONS')).toBeNull();
	});

	it('is case-insensitive', () => {
		expect(resolveScopeForMethod('get')).toBe('read');
		expect(resolveScopeForMethod('post')).toBe('write');
		expect(resolveScopeForMethod('Patch')).toBe('update');
	});

	it('returns null for unknown methods (forward-compat, no scope check applied)', () => {
		expect(resolveScopeForMethod('TRACE')).toBeNull();
		expect(resolveScopeForMethod('CONNECT')).toBeNull();
	});
});
