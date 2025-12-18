import '@/styles/globals.css';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { RootProvider } from 'fumadocs-ui/provider/next';
import Header from '@/components/Header';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import Providers from '@/components/provider';
import { NextIntlClientProvider } from 'next-intl';

const openSans = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
});

export async function generateMetadata() {
	return {
		title: 'QRcodly Documentation – QR Code API & Integration Guide',
		description:
			'Official QRcodly documentation for generating and managing QR codes via API. Learn how to create, customize, and integrate QR codes into your applications.',
		keywords:
			'QR code API, QRcodly, generate QR codes, QR code integration, QR code documentation, API key, QR code tutorial, QR code developer guide',

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

export default async function Layout({ children }: LayoutProps<'/docs'>) {
	return (
		<ClerkProvider>
			<html lang="en" className="light" suppressHydrationWarning>
				<head>
					<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
					<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
					<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
					<link rel="manifest" href="/site.webmanifest" />
				</head>
				<body className={`font-sans ${openSans.variable}`}>
					<NextIntlClientProvider>
						<Providers>
							<main className="flex min-h-screen flex-col justify-between bg-linear-to-br from-zinc-50 to-orange-100">
								<RootProvider
									theme={{
										enabled: false,
									}}
								>
									<DocsLayout
										themeSwitch={{
											enabled: false,
										}}
										tree={source.pageTree}
										{...baseOptions()}
									>
										<>
											<div className="hidden md:block sm:md-10">
												<Header hideLogo hideLanguageNav />
											</div>

											{children}
										</>
									</DocsLayout>
								</RootProvider>
							</main>
						</Providers>
					</NextIntlClientProvider>
					<Toaster />
				</body>
			</html>
		</ClerkProvider>
	);
}
