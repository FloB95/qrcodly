import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { pageUrl } from '@/components/marketing/seo';
import { QR_CODE_USE_CASES, URL_SHORTENER_USE_CASES } from '@/lib/use-case-pages';
import type { MetadataRoute } from 'next';

const PAGES = [
	'', // Home
	'docs',
	'plans',
	'products/url-shortener',
	'products/qr-codes',
	'products/analytics',
	'products/hosted-pages/pdf',
	'products/hosted-pages/digital-manual',
	'tools/qr-code-scanner',
	'faq',
	'imprint',
	'privacy-policy',
	'terms-of-service',
	...QR_CODE_USE_CASES.map((uc) => `${uc.parentPath.slice(1)}/${uc.slug}`),
	...URL_SHORTENER_USE_CASES.map((uc) => `${uc.parentPath.slice(1)}/${uc.slug}`),
];

const NOT_TRANSLATED = ['docs'];

export default function sitemap(): MetadataRoute.Sitemap {
	return PAGES.flatMap((page) => {
		if (NOT_TRANSLATED.includes(page)) {
			return [{ url: pageUrl(routing.defaultLocale, page) }];
		}

		const languages = {
			'x-default': pageUrl(routing.defaultLocale, page),
			...Object.fromEntries(SUPPORTED_LANGUAGES.map((lang) => [lang, pageUrl(lang, page)])),
		};
		// Every language version is its own entry, each listing all alternates.
		return SUPPORTED_LANGUAGES.map((lang) => ({
			url: pageUrl(lang, page),
			alternates: { languages },
		}));
	});
}
