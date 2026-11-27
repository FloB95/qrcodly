import { describe, expect, it } from 'vitest';
import { SHORT_URL_ALIAS_MAX_LENGTH, ShortUrlAliasSchema } from '@shared/schemas';
import { slugifyAlias } from './short-url-alias';

describe('slugifyAlias', () => {
	it.each([
		['Sommerfest 2026', 'sommerfest-2026'],
		['Menü Karte', 'menue-karte'],
		['Straße & Café', 'strasse-cafe'],
		['  leading spaces', 'leading-spaces'],
		['a  --  b', 'a-b'],
		['under_score.dot', 'under-score-dot'],
		['already-fine-123', 'already-fine-123'],
		['', ''],
	])('%j -> %j', (typed, expected) => {
		expect(slugifyAlias(typed)).toBe(expected);
	});

	it('keeps a hyphen at the end, so the next word can be typed', () => {
		expect(slugifyAlias('sommer ')).toBe('sommer-');
	});

	it('cuts the text at the longest alias', () => {
		expect(slugifyAlias('a'.repeat(200))).toHaveLength(SHORT_URL_ALIAS_MAX_LENGTH);
	});

	it('produces an alias the API accepts, once it does not end with a hyphen', () => {
		for (const typed of ['Sommerfest 2026', 'Menü Karte', 'Straße & Café']) {
			const alias = slugifyAlias(typed);
			expect(ShortUrlAliasSchema.parse(alias)).toBe(alias);
		}
	});
});
