import type { SupportedLanguages } from '../shims/i18n-routing';

// Dynamically import dictionaries from the frontend source via the @/ alias
const dictionaries: Record<SupportedLanguages, () => Promise<Record<string, unknown>>> = {
	en: () => import('@/dictionaries/en.json').then((m) => m.default),
	de: () => import('@/dictionaries/de.json').then((m) => m.default),
	nl: () => import('@/dictionaries/nl.json').then((m) => m.default),
	fr: () => import('@/dictionaries/fr.json').then((m) => m.default),
	it: () => import('@/dictionaries/it.json').then((m) => m.default),
	es: () => import('@/dictionaries/es.json').then((m) => m.default),
	pl: () => import('@/dictionaries/pl.json').then((m) => m.default),
	ru: () => import('@/dictionaries/ru.json').then((m) => m.default),
};

export async function loadMessages(locale: SupportedLanguages): Promise<Record<string, unknown>> {
	const loader = dictionaries[locale] ?? dictionaries.en;
	return loader();
}

export function getPreferredLocale(): SupportedLanguages {
	// Try to detect from browser/system locale
	const browserLang = navigator.language.split('-')[0];
	const supported: SupportedLanguages[] = ['en', 'de', 'nl', 'fr', 'it', 'es', 'pl', 'ru'];
	if (supported.includes(browserLang as SupportedLanguages)) {
		return browserLang as SupportedLanguages;
	}
	return 'en';
}
