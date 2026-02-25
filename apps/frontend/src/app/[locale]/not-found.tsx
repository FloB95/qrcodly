import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Logger } from 'next-axiom';
import { headers } from 'next/headers';

export default async function NotFoundPage() {
	const t = await getTranslations('notFound');

	const headersList = await headers();
	const path = headersList.get('x-pathname') || '/';

	const logger = new Logger({ source: 'not-found' });
	logger.warn(`Page Not Found ${path}`, {
		host: headersList.get('host') || 'unknown',
		method: 'GET',
		path,
		scheme: headersList.get('x-forwarded-proto') || 'http',
		userAgent: headersList.get('user-agent') || '',
		ip: headersList.get('cf-connecting-ip') || headersList.get('x-forwarded-for') || '',
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
