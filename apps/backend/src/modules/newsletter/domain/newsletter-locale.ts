import { type TNewsletterContentLocale } from '@shared/schemas';
import { type TNewsletterLocaleSource } from './newsletter-locale.interface';

/** Subscriber attribute the campaign template switches the language on */
export const LOCALE_ATTRIBUTE = 'locale';
export const LOCALE_SOURCE_ATTRIBUTE = 'locale_source';

/** A new account's default: German when it signed up on the German page (`unsafeMetadata.locale`) */
export const signUpLocale = (pageLocale: unknown): TNewsletterContentLocale =>
	pageLocale === 'de' ? 'de' : 'en';

export const localeAttribs = (
	locale: TNewsletterContentLocale,
	source: TNewsletterLocaleSource,
): Record<string, string> => ({ [LOCALE_ATTRIBUTE]: locale, [LOCALE_SOURCE_ATTRIBUTE]: source });

/** The language the campaign uses for the subscriber: German only when stored, else English */
export const storedLocale = (
	attribs: Record<string, unknown> | undefined,
): TNewsletterContentLocale => (attribs?.[LOCALE_ATTRIBUTE] === 'de' ? 'de' : 'en');
