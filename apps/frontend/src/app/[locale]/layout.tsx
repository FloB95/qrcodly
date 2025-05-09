import { ClerkProvider } from '@clerk/nextjs';
import '@/styles/globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import Providers from '@/components/provider';
import { env } from '@/env';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';

const openSans = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
});

export async function generateMetadata({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'metadata' });

	return {
		title: t('title'),
		description: t('description'),
		keywords: t('keywords'),
		icons: [
			{
				rel: 'icon',
				url: '/favicon.ico',
			},
		],
		openGraph: {
			images: [
				{
					url: 'https://www.qrcodly.de/og-image.webp',
				},
			],
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

	return (
		<ClerkProvider>
			<html lang={locale} className="light">
				<head>
					<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
					<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
					<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
					<link rel="manifest" href="/site.webmanifest" />
					{/* <script defer src="/umami.js" data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE}></script> */}
				</head>
				<body className={`font-sans ${openSans.variable}`}>
					<NextIntlClientProvider>
						<Providers>{children}</Providers>
					</NextIntlClientProvider>
					<Toaster />
				</body>
			</html>
		</ClerkProvider>
	);
}
