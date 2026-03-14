import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductFeatureSection } from '@/components/products/ProductFeatureSection';

import { ProductUseCases } from '@/components/products/ProductUseCases';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import {
	QrCustomizationMockup,
	QrScanAnalyticsMockup,
	QrContentTypesMockup,
	QrDynamicUpdatesMockup,
	QrBulkTemplatesMockup,
	QrApiAccessMockup,
} from '@/components/products/mockups/QrCodesMockups';
import {
	LinkIcon,
	ChartBarIcon,
	BuildingStorefrontIcon,
	ShoppingBagIcon,
	TicketIcon,
	HomeModernIcon,
	AcademicCapIcon,
	MegaphoneIcon,
} from '@heroicons/react/24/outline';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';
import { env } from '@/env';

const PAGE_PATH = 'products/qr-codes';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: 'productsQrCodes' });
	const baseUrl = env.NEXT_PUBLIC_FRONTEND_URL;

	return {
		title: t('metaTitle'),
		description: t('metaDescription'),
		alternates: {
			canonical:
				locale === routing.defaultLocale
					? `${baseUrl}/${PAGE_PATH}`
					: `${baseUrl}/${locale}/${PAGE_PATH}`,
			languages: {
				'x-default': `${baseUrl}/${PAGE_PATH}`,
				...Object.fromEntries(
					routing.locales
						.filter((l) => l !== locale)
						.map((l) => [
							l,
							l === routing.defaultLocale
								? `${baseUrl}/${PAGE_PATH}`
								: `${baseUrl}/${l}/${PAGE_PATH}`,
						]),
				),
			},
		},
	};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) notFound();

	const t = await getTranslations({ locale, namespace: 'productsQrCodes' });

	const features = [
		{
			title: t('features.customization.title'),
			description: t('features.customization.description'),
			bullets: [
				t('features.customization.bullet1'),
				t('features.customization.bullet2'),
				t('features.customization.bullet3'),
			],
			visual: <QrCustomizationMockup />,
		},
		{
			title: t('features.analytics.title'),
			description: t('features.analytics.description'),
			bullets: [
				t('features.analytics.bullet1'),
				t('features.analytics.bullet2'),
				t('features.analytics.bullet3'),
			],
			visual: <QrScanAnalyticsMockup />,
		},
		{
			title: t('features.contentTypes.title'),
			description: t('features.contentTypes.description'),
			bullets: [
				t('features.contentTypes.bullet1'),
				t('features.contentTypes.bullet2'),
				t('features.contentTypes.bullet3'),
			],
			visual: <QrContentTypesMockup />,
		},
		{
			title: t('features.dynamicUpdates.title'),
			description: t('features.dynamicUpdates.description'),
			bullets: [
				t('features.dynamicUpdates.bullet1'),
				t('features.dynamicUpdates.bullet2'),
				t('features.dynamicUpdates.bullet3'),
			],
			visual: <QrDynamicUpdatesMockup />,
		},
		{
			title: t('features.bulkTemplates.title'),
			description: t('features.bulkTemplates.description'),
			bullets: [
				t('features.bulkTemplates.bullet1'),
				t('features.bulkTemplates.bullet2'),
				t('features.bulkTemplates.bullet3'),
			],
			visual: <QrBulkTemplatesMockup />,
		},
		{
			title: t('features.apiAccess.title'),
			description: t('features.apiAccess.description'),
			bullets: [
				t('features.apiAccess.bullet1'),
				t('features.apiAccess.bullet2'),
				t('features.apiAccess.bullet3'),
			],
			visual: <QrApiAccessMockup />,
			actionButton: {
				label: t('features.apiAccess.actionLabel'),
				href: '/docs/api',
				external: true,
			},
		},
	];

	const useCaseIcons = [
		<BuildingStorefrontIcon key="1" className="h-5 w-5" />,
		<ShoppingBagIcon key="2" className="h-5 w-5" />,
		<TicketIcon key="3" className="h-5 w-5" />,
		<HomeModernIcon key="4" className="h-5 w-5" />,
		<AcademicCapIcon key="5" className="h-5 w-5" />,
		<MegaphoneIcon key="6" className="h-5 w-5" />,
	];

	const useCases = Array.from({ length: 6 }, (_, i) => ({
		icon: useCaseIcons[i],
		title: t(`useCases.case${i + 1}Title`),
		description: t(`useCases.case${i + 1}Description`),
	}));

	const faqItems = Array.from({ length: 6 }, (_, i) => ({
		question: t(`faq.q${i + 1}`),
		answer: t(`faq.a${i + 1}`),
	}));

	return (
		<>
			<Header />
			<article>
				<ProductHeroSection
					title={t('hero.title')}
					subtitle={t('hero.subtitle')}
					ctaLabel={t('hero.ctaLabel')}
					ctaHref="/#generator"
				/>

				{features.map((feature, i) => (
					<ProductFeatureSection
						key={feature.title}
						title={feature.title}
						description={feature.description}
						bullets={feature.bullets}
						visual={feature.visual}
						reversed={i % 2 === 1}
						actionButton={feature.actionButton}
					/>
				))}

				<ProductUseCases
					title={t('useCases.title')}
					subtitle={t('useCases.subtitle')}
					cases={useCases}
				/>

				<CrossProductCards
					title={t('crossProducts.title')}
					cards={[
						{
							title: t('crossProducts.urlShortener.title'),
							description: t('crossProducts.urlShortener.description'),
							href: '/products/url-shortener',
							icon: <LinkIcon className="h-5 w-5 sm:h-6 sm:w-6" />,
						},
						{
							title: t('crossProducts.analytics.title'),
							description: t('crossProducts.analytics.description'),
							href: '/products/analytics',
							icon: <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6" />,
						},
					]}
				/>

				<ProductFaqSection
					title={t('faq.title')}
					items={faqItems}
					viewAllLabel={t('faq.viewAll')}
				/>

				<ProductCtaSection
					title={t('cta.title')}
					subtitle={t('cta.subtitle')}
					ctaLabel={t('cta.ctaLabel')}
					ctaHref="/#generator"
				/>
			</article>
			<Footer />
		</>
	);
}
