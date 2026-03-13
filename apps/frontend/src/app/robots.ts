import { type MetadataRoute } from 'next';
import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/dashboard/',
					'/api/',
					'/cdn-cgi/',
					'/qr-code/',
					'/tag',
					'/config-template/',
					'/short-url/',
				],
			},
		],
		sitemap: `${env.NEXT_PUBLIC_FRONTEND_URL}/sitemap.xml`,
	};
}
