import '@/styles/globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import Providers from '@/components/provider';
import messages from '@/dictionaries/en.json';
import { Logger } from 'next-axiom';
import { cookies, headers } from 'next/headers';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
});

export default async function NotFoundPage() {
	const headersList = await headers();
	const cookieStore = await cookies();

	// Read request metadata from middleware cookie (most reliable source in not-found context)
	let reqPath = '/unknown';
	let reqHost = 'unknown';
	let reqIp = '';
	let reqScheme = 'https';

	try {
		const metaCookie = cookieStore.get('__req_meta');
		if (metaCookie) {
			const meta = JSON.parse(metaCookie.value) as Record<string, string>;
			reqPath = meta.p || reqPath;
			reqHost = meta.h || reqHost;
			reqIp = meta.i || reqIp;
			reqScheme = meta.s || reqScheme;
		}
	} catch {
		// Fall back to headers if cookie is not available
		reqPath = headersList.get('x-pathname') || reqPath;
		reqHost = headersList.get('x-forwarded-host') || headersList.get('host') || reqHost;
		reqIp =
			headersList.get('cf-connecting-ip') ||
			headersList.get('x-real-ip') ||
			headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
			reqIp;
		reqScheme = headersList.get('x-forwarded-proto') || reqScheme;
	}

	const logger = new Logger({ source: 'not-found' });
	logger.warn(`Page Not Found ${reqPath}`, {
		host: reqHost,
		method: 'GET',
		path: reqPath,
		scheme: reqScheme,
		userAgent: headersList.get('user-agent') || '',
		ip: reqIp,
		status: 404,
	});
	await logger.flush();

	return (
		<html lang="en" className="light">
			<head>
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
				<link rel="manifest" href="/site.webmanifest" />
			</head>
			<body className={`font-sans ${inter.variable}`}>
				<NextIntlClientProvider locale="en" messages={messages}>
					<Providers locale="en">
						<main className="flex min-h-screen flex-col justify-between bg-linear-to-br from-zinc-100 to-[#fddfbc] px-4 sm:px-0">
							<Header />

							<Container className="flex flex-1 flex-col items-center justify-center text-center py-24">
								<h1 className="mb-4 text-6xl font-semibold">404</h1>
								<p className="mb-6 text-xl">
									Oops! The page you&apos;re looking for doesn&apos;t exist.
								</p>
								<Link href="/" className={buttonVariants()}>
									Go Back Home
								</Link>
							</Container>

							<Footer />
						</main>
					</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
