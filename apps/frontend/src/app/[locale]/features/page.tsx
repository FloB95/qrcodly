import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FeaturesPage } from '@/components/FeaturesPage';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';
import { env } from '@/env';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) {
		return {};
	}
	const t = await getTranslations({ locale, namespace: 'featuresPage' });
	const baseUrl = env.NEXT_PUBLIC_FRONTEND_URL;

	return {
		title: t('metaTitle'),
		description: t('metaDescription'),
		alternates: {
			canonical:
				locale === routing.defaultLocale ? `${baseUrl}/features` : `${baseUrl}/${locale}/features`,
			languages: {
				'x-default': `${baseUrl}/features`,
				...Object.fromEntries(
					routing.locales
						.filter((l) => l !== locale)
						.map((l) => [
							l,
							l === routing.defaultLocale ? `${baseUrl}/features` : `${baseUrl}/${l}/features`,
						]),
				),
			},
		},
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
