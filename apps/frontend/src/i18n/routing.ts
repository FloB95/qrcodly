import { defineRouting } from 'next-intl/routing';
import { registerLocale, type LocaleData } from 'i18n-iso-countries';

export const SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'it', 'es', 'pl', 'pt', 'ru'] as const;
export type SupportedLanguages = (typeof SUPPORTED_LANGUAGES)[number];

export const routing = defineRouting({
	locales: [...SUPPORTED_LANGUAGES],
	defaultLocale: 'en',
	localePrefix: 'as-needed',
});

function localizedPath(path: string, locale?: string) {
	const prefixed =
		locale !== routing.defaultLocale && SUPPORTED_LANGUAGES.some((l) => l === locale);
	return prefixed ? `/${locale}${path}` : path;
}

/** Our own Clerk auth pages. Clerk's hosted pages ignore our localization and its notices. */
export const signInPath = (locale?: string) => localizedPath('/sign-in', locale);
export const signUpPath = (locale?: string) => localizedPath('/sign-up', locale);

SUPPORTED_LANGUAGES.forEach((lang) => {
	import(`i18n-iso-countries/langs/${lang}.json`)
		.then((module) => {
			const locale = module as { default: LocaleData };
			registerLocale(locale.default);
		})
		.catch(() => {});
});
