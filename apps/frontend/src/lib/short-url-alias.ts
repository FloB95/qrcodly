import { SHORT_URL_ALIAS_MAX_LENGTH } from '@shared/schemas';

/**
 * Turns what someone types into the form an alias may have: lower case letters, digits and single
 * hyphens. A hyphen at the end stays, so the next word can still be typed.
 */
export function slugifyAlias(text: string): string {
	return text
		.toLowerCase()
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+/, '')
		.slice(0, SHORT_URL_ALIAS_MAX_LENGTH);
}
