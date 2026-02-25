import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Logger } from 'next-axiom';
import { cookies, headers } from 'next/headers';

export default async function NotFoundPage() {
	const t = await getTranslations('notFound');

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
		<>
			<Header />

			<Container className="flex flex-1 flex-col items-center justify-center text-center py-24">
				<h1 className="mb-4 text-6xl font-semibold">404</h1>
				<p className="mb-6 text-xl">{t('message')}</p>
				<Link href="/" className={buttonVariants()}>
					{t('goHome')}
				</Link>
			</Container>

			<Footer />
		</>
	);
}
