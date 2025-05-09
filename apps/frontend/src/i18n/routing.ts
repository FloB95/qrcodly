import { defineRouting } from 'next-intl/routing';
import { registerLocale, type LocaleData } from 'i18n-iso-countries';

export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type SupportedLanguages = (typeof SUPPORTED_LANGUAGES)[number];

export const routing = defineRouting({
	locales: [...SUPPORTED_LANGUAGES],
	defaultLocale: 'en',
});

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
