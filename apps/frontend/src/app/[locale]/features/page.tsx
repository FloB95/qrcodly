import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FeaturesPage } from '@/components/FeaturesPage';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) {
		return {};
	}
	const t = await getTranslations({ locale, namespace: 'featuresPage' });

	return {
		title: `${t('badge')} - QRcodly`,
		description: t('subtitle'),
	};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) {
		notFound();
	}

	return (
		<>
			<Header />
			<article>
				<FeaturesPage locale={locale} />
			</article>
			<Footer />
		</>
	);
}
