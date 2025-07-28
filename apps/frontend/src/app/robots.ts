import { type MetadataRoute } from 'next';
import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
			},
		],
		sitemap: `${env.NEXT_PUBLIC_FRONTEND_URL}/sitemap.xml`,
	};
}
