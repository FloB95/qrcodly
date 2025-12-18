// app/[locale]/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
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
import { deDE, enUS, frFR, itIT, esES, nlNL, plPL, ruRU } from '@clerk/localizations';

const openSans = Inter({ subsets: ['latin'], variable: '--font-sans' });

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

	const localeMap: Record<string, typeof enUS> = {
		en: enUS,
		de: deDE,
		nl: nlNL,
		fr: frFR,
		it: itIT,
		es: esES,
		pl: plPL,
		ru: ruRU,
	};

	const clerkLocale = localeMap[locale] || enUS;

	return (
		<html lang={locale} className="light" suppressHydrationWarning>
			<ClerkProvider localization={clerkLocale}>
				<head>
					{/* SEO Meta-Tags */}
					<title>{t('title')}</title>
					<meta name="description" content={t('description')} />
					<meta name="keywords" content={t('keywords')} />

					{/* OpenGraph */}
					<meta property="og:title" content={t('title')} />
					<meta property="og:description" content={t('description')} />
					<meta property="og:image" content="https://www.qrcodly.de/og-image.webp" />

					{/* Favicons */}
					<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
					<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
					<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
					<link rel="manifest" href="/site.webmanifest" />

					<meta name="google" content="notranslate" />

					{/* Alternate Languages */}
					{alternateLinks}
				</head>

				<body className={`font-sans ${openSans.variable}`}>
					<NextIntlClientProvider>
						<Providers>{children}</Providers>
					</NextIntlClientProvider>
					<Toaster />
				</body>
			</ClerkProvider>
		</html>
	);
}
