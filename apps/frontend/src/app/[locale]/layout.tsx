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
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
	display: 'swap',
});

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

	// Übersetzungen für Meta-Tags
	const t = await getTranslations({ locale, namespace: 'metadata' });

	// Alternate Links
	const alternateLinks = routing.locales
		.filter((l) => l !== locale)
		.map((lang) => (
			<link
				key={lang}
				rel="alternate"
				hrefLang={lang}
				href={`${env.NEXT_PUBLIC_FRONTEND_URL}/${lang}`}
			/>
		));

	// Organization Structured Data (site-wide)
	const organizationData = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'QRcodly',
		url: 'https://www.qrcodly.de',
		logo: 'https://www.qrcodly.de/logo.png',
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

				{/* Primary Meta Tags */}
				<title>{t('title')}</title>
				<meta name="title" content={t('title')} />
				<meta name="description" content={t('description')} />
				<meta name="keywords" content={t('keywords')} />

				{/* Robots & Crawling */}
				<meta
					name="robots"
					content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
				/>
				<meta
					name="googlebot"
					content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
				/>
				<meta name="google" content="notranslate" />

				{/* Canonical URL */}
				<link rel="canonical" href={`https://www.qrcodly.de/${locale}`} />

				{/* Open Graph / Facebook */}
				<meta property="og:type" content="website" />
				<meta property="og:url" content="https://www.qrcodly.de" />
				<meta property="og:title" content={t('title')} />
				<meta property="og:description" content={t('description')} />
				<meta property="og:image" content="https://www.qrcodly.de/og-image.webp" />
				<meta property="og:image:width" content="1200" />
				<meta property="og:image:height" content="630" />
				<meta property="og:image:alt" content="QRcodly - Free QR Code Generator" />
				<meta property="og:site_name" content="QRcodly" />
				<meta property="og:locale" content={locale === 'de' ? 'de_DE' : 'en_US'} />

				{/* Twitter */}
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:url" content="https://www.qrcodly.de" />
				<meta name="twitter:title" content={t('title')} />
				<meta name="twitter:description" content={t('description')} />
				<meta name="twitter:image" content="https://www.qrcodly.de/og-image.webp" />

				{/* Favicons */}
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
				<link rel="manifest" href="/site.webmanifest" />

				{/* Alternate Languages */}
				<link rel="alternate" hrefLang="x-default" href="https://www.qrcodly.de" />
				{alternateLinks}
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
				<ServiceWorkerRegistration />
			</body>
		</html>
	);
}
