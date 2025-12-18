import { env } from '@/env';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { MetadataRoute } from 'next';

const PAGES = [
	'', // Home
	'docs',
];

export default function sitemap(): MetadataRoute.Sitemap {
	return PAGES.map((page) => {
		const url = `${env.NEXT_PUBLIC_FRONTEND_URL}${page ? `/${page}` : ''}`;

		let alternates: Record<string, string> = {};

		if (page !== 'docs') {
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
