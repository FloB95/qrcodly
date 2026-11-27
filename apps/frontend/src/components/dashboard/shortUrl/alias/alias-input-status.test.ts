import { describe, expect, it } from 'vitest';
import { ShortUrlAliasConflict } from '@shared/schemas';
import { aliasInputStatus, AliasInputStatus, canSaveAlias } from './alias-input-status';

const statusOf = (
	value: string,
	check: Parameters<typeof aliasInputStatus>[0]['check'] = 'pending',
	currentAlias: string | null = null,
) => aliasInputStatus({ value, currentAlias, check });

describe('aliasInputStatus', () => {
	it('tells an empty field from the alias the short URL already has', () => {
		expect(statusOf('')).toBe(AliasInputStatus.EMPTY);
		expect(statusOf('menu', 'pending', 'menu')).toBe(AliasInputStatus.UNCHANGED);
	});

	it('names what is wrong with the text before it asks the server', () => {
		expect(statusOf('me', { available: true, conflict: null })).toBe(AliasInputStatus.TOO_SHORT);
		expect(statusOf('menu-', { available: true, conflict: null })).toBe(
			AliasInputStatus.TRAILING_HYPHEN,
		);
	});

	it('waits for the check of a well-formed alias', () => {
		expect(statusOf('menu')).toBe(AliasInputStatus.CHECKING);
	});

	it('reports the answer of the check', () => {
		expect(statusOf('menu', { available: true, conflict: null })).toBe(AliasInputStatus.AVAILABLE);
		expect(statusOf('menu', { available: false, conflict: ShortUrlAliasConflict.TAKEN })).toBe(
			AliasInputStatus.TAKEN,
		);
		expect(
			statusOf('pizza', { available: false, conflict: ShortUrlAliasConflict.MATCHES_SHORT_CODE }),
		).toBe(AliasInputStatus.NOT_AVAILABLE);
		expect(statusOf('menu', 'failed')).toBe(AliasInputStatus.CHECK_FAILED);
	});
});

describe('canSaveAlias', () => {
	it('lets an available alias through, and one whose check failed: the API decides', () => {
		expect(canSaveAlias(AliasInputStatus.AVAILABLE)).toBe(true);
		expect(canSaveAlias(AliasInputStatus.CHECK_FAILED)).toBe(true);
	});

	it.each([
		AliasInputStatus.EMPTY,
		AliasInputStatus.UNCHANGED,
		AliasInputStatus.TOO_SHORT,
		AliasInputStatus.TRAILING_HYPHEN,
		AliasInputStatus.CHECKING,
		AliasInputStatus.TAKEN,
		AliasInputStatus.NOT_AVAILABLE,
	])('holds back an alias that is %s', (status) => {
		expect(canSaveAlias(status)).toBe(false);
	});
});
