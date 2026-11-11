import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductBento } from '@/components/products/ProductBento';
import { ProductStatsBar } from '@/components/products/ProductStatsBar';
import { ProductUseCases } from '@/components/products/ProductUseCases';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { BreadcrumbJsonLd, marketingMetadata } from '@/components/marketing/seo';
import {
	AnalyticsHeroMockup,
	RealTimeMetricsMockup,
	IntegrationsDashboardMockup,
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
	ShieldCheckIcon,
	GlobeEuropeAfricaIcon,
} from '@heroicons/react/24/outline';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';

const PAGE_PATH = 'products/analytics';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: 'productsAnalytics' });
	return marketingMetadata(locale, PAGE_PATH, {
		title: t('metaTitle'),
		description: t('metaDescription'),
	});
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) notFound();

	const t = await getTranslations({ locale, namespace: 'productsAnalytics' });
	const m = await getTranslations({ locale, namespace: 'marketing' });

	const icon = 'size-5';

	const useCaseIcons = [
		<AdjustmentsHorizontalIcon key="1" className={icon} />,
		<MapPinIcon key="2" className={icon} />,
		<DevicePhoneMobileIcon key="3" className={icon} />,
		<DocumentChartBarIcon key="4" className={icon} />,
		<ArrowsRightLeftIcon key="5" className={icon} />,
		<ArrowsPointingInIcon key="6" className={icon} />,
	];

	const useCases = useCaseIcons.map((caseIcon, i) => ({
		icon: caseIcon,
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
			<article className="text-slate-900">
				<FaqJsonLd items={faqItems} />
				<BreadcrumbJsonLd locale={locale} items={[{ name: t('badge'), path: PAGE_PATH }]} />

				<ProductHeroSection
					eyebrow={t('badge')}
					title={t('hero.title')}
					subtitle={t('hero.subtitle')}
					ctaLabel={t('hero.ctaLabel')}
					ctaHref="/#generator"
					visual={<AnalyticsHeroMockup />}
				/>

				<ProductStatsBar
					eyebrow={m('eyebrow.numbers')}
					stats={[1, 2, 3, 4].map((n) => ({
						value: t(`stats.stat${n}Value`),
						label: t(`stats.stat${n}Label`),
					}))}
				/>

				<ProductBento
					eyebrow={m('eyebrow.features')}
					title={t('features.title')}
					tiles={[
						{
							title: t('features.realTime.title'),
							description: t('features.realTime.description'),
							span: 4,
							visual: <RealTimeMetricsMockup />,
						},
						{
							title: t('features.privacy.title'),
							description: t('features.privacy.description'),
							span: 2,
							dark: true,
							icon: <ShieldCheckIcon className={icon} />,
						},
						{
							title: t('features.geographic.title'),
							description: t('features.geographic.description'),
							span: 2,
							icon: <GlobeEuropeAfricaIcon className={icon} />,
						},
						{
							title: t('features.integrations.title'),
							description: t('features.integrations.description'),
							span: 4,
							visual: <IntegrationsDashboardMockup />,
						},
					]}
				/>

				<ProductUseCases
					eyebrow={m('eyebrow.useCases')}
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
							icon: <LinkIcon className={icon} />,
						},
						{
							title: t('crossProducts.qrCodes.title'),
							description: t('crossProducts.qrCodes.description'),
							href: '/products/qr-codes',
							icon: <QrCodeIcon className={icon} />,
						},
					]}
				/>

				<ProductFaqSection
					eyebrow={m('eyebrow.faq')}
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
