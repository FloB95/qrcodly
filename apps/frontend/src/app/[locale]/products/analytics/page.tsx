import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductFeatureSection } from '@/components/products/ProductFeatureSection';

import { ProductUseCases } from '@/components/products/ProductUseCases';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import {
	RealTimeMetricsMockup,
	ChannelComparisonMockup,
	IntegrationsDashboardMockup,
	GeographicInsightsMockup,
	ExportReportingMockup,
	PrivacyFirstMockup,
} from '@/components/products/mockups/AnalyticsMockups';
import {
	LinkIcon,
	QrCodeIcon,
	AdjustmentsHorizontalIcon,
	MapPinIcon,
	DevicePhoneMobileIcon,
	DocumentChartBarIcon,
	ArrowsRightLeftIcon,
	ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';
import { env } from '@/env';

const PAGE_PATH = 'products/analytics';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: 'productsAnalytics' });
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

	const t = await getTranslations({ locale, namespace: 'productsAnalytics' });

	const features = [
		{
			title: t('features.realTime.title'),
			description: t('features.realTime.description'),
			bullets: [
				t('features.realTime.bullet1'),
				t('features.realTime.bullet2'),
				t('features.realTime.bullet3'),
			],
			visual: <RealTimeMetricsMockup />,
		},
		{
			title: t('features.channels.title'),
			comingSoon: t('features.channels.comingSoon'),
			description: t('features.channels.description'),
			bullets: [
				t('features.channels.bullet1'),
				t('features.channels.bullet2'),
				t('features.channels.bullet3'),
			],
			visual: <ChannelComparisonMockup />,
		},
		{
			title: t('features.integrations.title'),
			description: t('features.integrations.description'),
			bullets: [
				t('features.integrations.bullet1'),
				t('features.integrations.bullet2'),
				t('features.integrations.bullet3'),
			],
			visual: <IntegrationsDashboardMockup />,
		},
		{
			title: t('features.geographic.title'),
			description: t('features.geographic.description'),
			bullets: [
				t('features.geographic.bullet1'),
				t('features.geographic.bullet2'),
				t('features.geographic.bullet3'),
			],
			visual: <GeographicInsightsMockup />,
		},
		{
			title: t('features.exportReporting.title'),
			comingSoon: t('features.exportReporting.comingSoon'),
			description: t('features.exportReporting.description'),
			bullets: [
				t('features.exportReporting.bullet1'),
				t('features.exportReporting.bullet2'),
				t('features.exportReporting.bullet3'),
			],
			visual: <ExportReportingMockup />,
		},
		{
			title: t('features.privacy.title'),
			description: t('features.privacy.description'),
			bullets: [
				t('features.privacy.bullet1'),
				t('features.privacy.bullet2'),
				t('features.privacy.bullet3'),
			],
			visual: <PrivacyFirstMockup />,
		},
	];

	const useCaseIcons = [
		<AdjustmentsHorizontalIcon key="1" className="h-5 w-5" />,
		<MapPinIcon key="2" className="h-5 w-5" />,
		<DevicePhoneMobileIcon key="3" className="h-5 w-5" />,
		<DocumentChartBarIcon key="4" className="h-5 w-5" />,
		<ArrowsRightLeftIcon key="5" className="h-5 w-5" />,
		<ArrowsPointingInIcon key="6" className="h-5 w-5" />,
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
						comingSoon={feature.comingSoon}
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
							title: t('crossProducts.qrCodes.title'),
							description: t('crossProducts.qrCodes.description'),
							href: '/products/qr-codes',
							icon: <QrCodeIcon className="h-5 w-5 sm:h-6 sm:w-6" />,
						},
					]}
				/>

				<ProductFaqSection title={t('faq.title')} items={faqItems} />
			</article>
			<Footer />
		</>
	);
}
