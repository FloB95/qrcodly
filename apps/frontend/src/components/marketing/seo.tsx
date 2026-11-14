import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { env } from '@/env';

/** Absolute URL of a page in the given locale; `path` without leading slash, '' for the home page. */
export function pageUrl(locale: string, path: string) {
	const baseUrl = env.NEXT_PUBLIC_FRONTEND_URL;
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
	return `${baseUrl}${prefix}${path ? `/${path}` : ''}`;
}

const ogLocale = (locale: string) =>
	locale === 'en' ? 'en_US' : `${locale}_${locale.toUpperCase()}`;

/**
 * Title, description, canonical, hreflang, Open Graph and Twitter card of a marketing page.
 * Next.js replaces the layout's `openGraph` as a whole, so the image is repeated here.
 */
export function marketingMetadata(
	locale: string,
	path: string,
	{ title, description }: { title: string; description: string },
): Metadata {
	const url = pageUrl(locale, path);
	const image = `${env.NEXT_PUBLIC_FRONTEND_URL}/og-image.webp`;
	return {
		title,
		description,
		alternates: {
			canonical: url,
			languages: {
				'x-default': pageUrl(routing.defaultLocale, path),
				...Object.fromEntries(routing.locales.map((l) => [l, pageUrl(l, path)])),
			},
		},
		openGraph: {
			type: 'website',
			siteName: 'QRcodly',
			url,
			title,
			description,
			locale: ogLocale(locale),
			images: [{ url: image, width: 1200, height: 630, alt: title }],
		},
		twitter: { card: 'summary_large_image', title, description, images: [image] },
	};
}

/** BreadcrumbList from the home page down to the current page. */
export function BreadcrumbJsonLd({
	locale,
	items,
}: {
	locale: string;
	items: Array<{ name: string; path: string }>;
}) {
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [{ name: 'QRcodly', path: '' }, ...items].map((item, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: item.name,
			item: pageUrl(locale, item.path),
		})),
	}).replaceAll('<', '\\u003c');
	return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />;
}
