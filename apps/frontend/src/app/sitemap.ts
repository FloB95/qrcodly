import { env } from '@/env';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { MetadataRoute } from 'next';

const PAGES = ['', 'doc'];

export default function sitemap(): MetadataRoute.Sitemap {
	return PAGES.map((page) => {
		const url = `${env.NEXT_PUBLIC_FRONTEND_URL}${page ? `/${page}` : ''}`;
		const alternates: Record<string, string> = {};

		for (const lang of SUPPORTED_LANGUAGES.filter((l) => l !== 'en')) {
			alternates[lang] = `${env.NEXT_PUBLIC_FRONTEND_URL}/${lang}${page ? `/${page}` : ''}`;
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
