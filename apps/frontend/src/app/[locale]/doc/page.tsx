'use server';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Container from '@/components/ui/container';
import { getTranslations } from 'next-intl/server';

export default async function Documentation() {
	const t = await getTranslations();
	return (
		<main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
			<div className="min-h-screen bg-gradient-to-br from-zinc-50 to-orange-100">
				<Header />
				<Container>
					<div className="py-32 text-center md:py-60">
						<h1 className="text-4xl font-bold">{t('doc.title')}</h1>
						<p className="mt-4 text-lg text-gray-600">{t('doc.description')}</p>
					</div>
				</Container>
				<Footer />
			</div>
		</main>
	);
}
