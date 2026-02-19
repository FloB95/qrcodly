import '@/styles/globals.css';
import Header from '@/components/Header';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { NextIntlClientProvider } from 'next-intl';
import Footer from '@/components/Footer';
import Container from '@/components/ui/container';
import Providers from '@/components/provider';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
});

export const metadata: Metadata = {
	openGraph: {
		images: ['https://www.qrcodly.de/og-image.webp'],
		siteName: 'QRcodly',
	},
	icons: {
		apple: '/apple-touch-icon.png',
		icon: [
			{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
			{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
		],
	},
	manifest: '/site.webmanifest',
};

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="light" suppressHydrationWarning>
			<body className={`font-sans ${inter.variable}`}>
				<NextIntlClientProvider>
					<Providers locale={'en'}>
						<main className="flex min-h-screen flex-col justify-between bg-linear-to-br from-zinc-100 to-[#fddfbc] px-4 sm:px-0">
							<Header hideLanguageNav />
							<Container className="mt-22 px-6 sm:px-20 lg:px-40 mb-20">{children}</Container>
							<Footer />
						</main>
					</Providers>
				</NextIntlClientProvider>
				<Toaster />
			</body>
		</html>
	);
}
