// app/docs/layout.tsx
import '@/styles/globals.css';
import Header from '@/components/Header';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { NextIntlClientProvider } from 'next-intl';
import Footer from '@/components/Footer';
import Container from '@/components/ui/container';

const openSans = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
});

export default function Layout({ children }: LayoutProps<'/docs'>) {
	return (
		<html lang="en" className="light" suppressHydrationWarning>
			<head>
				{/* SEO Meta-Tags */}
				<title>QRcodly Documentation – QR Code API & Integration Guide</title>
				<meta
					name="description"
					content="Official QRcodly documentation for generating and managing QR codes via API. Learn how to create, customize, and integrate QR codes into your applications."
				/>
				<meta
					name="keywords"
					content="QR code API, QRcodly, generate QR codes, QR code integration, QR code documentation, API key, QR code tutorial, QR code developer guide"
				/>

				{/* OpenGraph */}
				<meta
					property="og:title"
					content="QRcodly Documentation – QR Code API & Integration Guide"
				/>
				<meta
					property="og:description"
					content="Official QRcodly documentation for generating and managing QR codes via API. Learn how to create, customize, and integrate QR codes into your applications."
				/>
				<meta property="og:image" content="https://www.qrcodly.de/og-image.webp" />

				{/* Favicons */}
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
				<link rel="manifest" href="/site.webmanifest" />
			</head>

			<body className={`font-sans ${openSans.variable}`}>
				<NextIntlClientProvider>
					<main className="flex min-h-screen flex-col justify-between bg-linear-to-br from-zinc-100 to-[#fddfbc] px-4 sm:px-0">
						<Header hideLanguageNav />
						<Container className="mt-22 px-6 sm:px-20 lg:px-40 mb-10">{children}</Container>
						<Footer />
					</main>
				</NextIntlClientProvider>
				<Toaster />
			</body>
		</html>
	);
}
