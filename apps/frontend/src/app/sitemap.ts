import { env } from '@/env';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { MetadataRoute } from 'next';

const PAGES = [
	'', // Home
	'docs',
	'plans',
	'features',
	'imprint',
	'privacy-policy',
];

const NOT_TRANSLATED = ['docs', 'imprint', 'privacy-policy'];

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = env.NEXT_PUBLIC_FRONTEND_URL;

	return PAGES.map((page) => {
		const url = `${baseUrl}${page ? `/${page}` : ''}`;

		let alternates: Record<string, string> = {};

		if (!NOT_TRANSLATED.includes(page)) {
			alternates = Object.fromEntries(
				SUPPORTED_LANGUAGES.map((lang) => [
					lang,
					lang === 'en'
						? `${baseUrl}${page ? `/${page}` : ''}`
						: `${baseUrl}/${lang}${page ? `/${page}` : ''}`,
				]),
			);
		}

		return {
			url,
			lastModified: new Date(),
			alternates: {
				languages: alternates,
			},
		};
	});
}
