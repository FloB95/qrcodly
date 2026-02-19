import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFoundPage() {
	const t = await getTranslations('notFound');

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
