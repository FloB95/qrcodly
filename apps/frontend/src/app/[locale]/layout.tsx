import '@/styles/globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import Providers from '@/components/provider';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { env } from '@/env';
import type { Metadata } from 'next';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
	display: 'swap',
});

export async function generateMetadata({
	params,
}: {
	params: DefaultPageParams['params'];
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'metadata' });
	const baseUrl = env.NEXT_PUBLIC_FRONTEND_URL;
	const ogLocale = locale === 'en' ? 'en_US' : `${locale}_${locale.toUpperCase()}`;

	return {
		title: {
			default: t('title'),
			template: '%s | QRcodly',
		},
		description: t('description'),
		keywords: t('keywords'),
		robots: {
			index: true,
			follow: true,
			'max-image-preview': 'large' as const,
			'max-snippet': -1,
			'max-video-preview': -1,
			googleBot: {
				index: true,
				follow: true,
				'max-image-preview': 'large' as const,
				'max-snippet': -1,
				'max-video-preview': -1,
			},
		},
		alternates: {
			canonical: `${baseUrl}/${locale}`,
			languages: {
				'x-default': baseUrl,
				...Object.fromEntries(
					routing.locales.filter((l) => l !== locale).map((l) => [l, `${baseUrl}/${l}`]),
				),
			},
		},
		openGraph: {
			type: 'website',
			url: baseUrl,
			images: [
				{
					url: `${baseUrl}/og-image.webp`,
					width: 1200,
					height: 630,
					alt: 'QRcodly - Free QR Code Generator',
				},
			],
			siteName: 'QRcodly',
			locale: ogLocale,
		},
		twitter: {
			card: 'summary_large_image',
			images: [`${baseUrl}/og-image.webp`],
		},
		icons: {
			apple: '/apple-touch-icon.png',
			icon: [
				{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
				{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			],
		},
		manifest: '/site.webmanifest',
		other: {
			google: 'notranslate',
		},
	};
}

export default async function RootLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: DefaultPageParams['params'];
}) {
	const { locale } = await params;

	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}

	// Organization Structured Data (site-wide)
	const organizationData = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'QRcodly',
		url: env.NEXT_PUBLIC_FRONTEND_URL,
		logo: `${env.NEXT_PUBLIC_FRONTEND_URL}/logo.png`,
		sameAs: [],
	};

	return (
		<html lang={locale} className="light" suppressHydrationWarning>
			<head>
				{/* Preconnect to critical third-party domains for faster connections */}
				<link rel="preconnect" href="https://clerk.qrcodly.de" crossOrigin="anonymous" />
				<link rel="dns-prefetch" href="https://clerk.qrcodly.de" />

				{/* Organization Structured Data */}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
				/>
			</head>

			<body className={`font-sans ${inter.variable}`} suppressHydrationWarning>
				<NextIntlClientProvider>
					<Providers locale={locale}>
						<main className="flex min-h-screen flex-col justify-between bg-linear-to-br from-zinc-100 to-[#fddfbc] px-4 sm:px-0">
							{children}
						</main>
					</Providers>
				</NextIntlClientProvider>
				<Toaster />
			</body>
		</html>
	);
}
