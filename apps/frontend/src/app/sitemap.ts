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
	return PAGES.map((page) => {
		const url = `${env.NEXT_PUBLIC_FRONTEND_URL}${page ? `/${page}` : ''}`;

		let alternates: Record<string, string> = {};

		if (!NOT_TRANSLATED.includes(page)) {
			alternates = Object.fromEntries(
				SUPPORTED_LANGUAGES.filter((lang) => lang !== 'en').map((lang) => [
					lang,
					`${env.NEXT_PUBLIC_FRONTEND_URL}/${lang}${page ? `/${page}` : ''}`,
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
