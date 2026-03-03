// Shim for @/i18n/routing — provides the same exports without next-intl/routing dependency
import { registerLocale, type LocaleData } from 'i18n-iso-countries';

export const SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'it', 'es', 'pl', 'ru'] as const;
export type SupportedLanguages = (typeof SUPPORTED_LANGUAGES)[number];

export const routing = {
	locales: [...SUPPORTED_LANGUAGES] as readonly string[],
	defaultLocale: 'en' as const,
	localePrefix: 'as-needed' as const,
};

// Registering locales for i18n-iso-countries
SUPPORTED_LANGUAGES.forEach((lang) => {
	import(`i18n-iso-countries/langs/${lang}.json`)
		.then((module) => {
			const locale = module as { default: LocaleData };
			registerLocale(locale.default);
		})
		.catch((error) => {
			console.error(`Failed to load locale for language: ${lang}`, error);
		});
});
