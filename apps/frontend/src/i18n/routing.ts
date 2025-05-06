import { defineRouting } from 'next-intl/routing';

export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type SupportedLanguages = (typeof SUPPORTED_LANGUAGES)[number];

export const routing = defineRouting({
	locales: [...SUPPORTED_LANGUAGES],
	defaultLocale: 'en',
});
