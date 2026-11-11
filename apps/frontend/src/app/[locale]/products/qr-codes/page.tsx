import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductBento } from '@/components/products/ProductBento';
import { ProductUseCases } from '@/components/products/ProductUseCases';
import { ProductStatsBar } from '@/components/products/ProductStatsBar';
import { DynamicVsStatic } from '@/components/products/DynamicVsStatic';
import { ProductTestimonial } from '@/components/products/ProductTestimonial';
import { INHOTEL_TESTIMONIAL } from '@/lib/testimonials';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { BreadcrumbJsonLd, marketingMetadata } from '@/components/marketing/seo';
import { CONTENT_TYPE_CONFIGS } from '@/lib/content-type.config';
import {
	QrCodesHeroMockup,
	QrCustomizationMockup,
	QrScanAnalyticsMockup,
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
	Squares2X2Icon,
	ArrowPathIcon,
	DocumentTextIcon,
	RectangleStackIcon,
	CommandLineIcon,
} from '@heroicons/react/24/outline';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';

const PAGE_PATH = 'products/qr-codes';
const TYPE_COUNT = CONTENT_TYPE_CONFIGS.length;

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: 'productsQrCodes' });
	return marketingMetadata(locale, PAGE_PATH, {
		title: t('metaTitle'),
		description: t('metaDescription'),
	});
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) notFound();

	const t = await getTranslations({ locale, namespace: 'productsQrCodes' });
	const m = await getTranslations({ locale, namespace: 'marketing' });
	const tabs = await getTranslations({ locale, namespace: 'generator.contentSwitch.tab' });

	const icon = 'size-5';

	const useCaseIcons = [
		<BuildingStorefrontIcon key="1" className={icon} />,
		<ShoppingBagIcon key="2" className={icon} />,
		<TicketIcon key="3" className={icon} />,
		<HomeModernIcon key="4" className={icon} />,
		<AcademicCapIcon key="5" className={icon} />,
		<MegaphoneIcon key="6" className={icon} />,
	];

	const useCaseSlugs = ['restaurants', 'retail', 'events', 'real-estate', 'education', 'marketing'];

	const useCases = useCaseSlugs.map((slug, i) => ({
		icon: useCaseIcons[i],
		title: t(`useCases.case${i + 1}Title`),
		description: t(`useCases.case${i + 1}Description`),
		href: `/products/qr-codes/${slug}`,
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
					secondaryCtaLabel={t('hero.viewPricing')}
					secondaryCtaHref="/plans"
					chips={CONTENT_TYPE_CONFIGS.map((config) => tabs(config.type))}
					visual={<QrCodesHeroMockup />}
				/>

				<ProductStatsBar
					eyebrow={m('eyebrow.numbers')}
					title={t('facts.title')}
					stats={[
						{ value: String(TYPE_COUNT), label: t('facts.fact1Label') },
						...[2, 3, 4].map((n) => ({
							value: t(`facts.fact${n}Value`),
							label: t(`facts.fact${n}Label`),
						})),
					]}
				/>

				<ProductBento
					eyebrow={m('eyebrow.features')}
					title={t('features.title')}
					tiles={[
						{
							title: t('features.customization.title'),
							description: t('features.customization.description'),
							span: 4,
							visual: <QrCustomizationMockup />,
						},
						{
							title: t('features.contentTypes.title', { count: TYPE_COUNT }),
							description: t('features.contentTypes.description'),
							span: 2,
							dark: true,
							icon: <Squares2X2Icon className={icon} />,
						},
						{
							title: t('features.dynamicUpdates.title'),
							description: t('features.dynamicUpdates.description'),
							span: 2,
							icon: <ArrowPathIcon className={icon} />,
						},
						{
							title: t('features.hostedPages.title'),
							description: t('features.hostedPages.description'),
							span: 2,
							icon: <DocumentTextIcon className={icon} />,
							action: {
								label: t('features.hostedPages.actionLabel'),
								href: '/products/hosted-pages/pdf',
							},
						},
						{
							title: t('features.bulkTemplates.title'),
							description: t('features.bulkTemplates.description'),
							span: 2,
							icon: <RectangleStackIcon className={icon} />,
						},
						{
							title: t('features.analytics.title'),
							description: t('features.analytics.description'),
							span: 4,
							visual: <QrScanAnalyticsMockup />,
						},
						{
							title: t('features.apiAccess.title'),
							description: t('features.apiAccess.description'),
							span: 2,
							dark: true,
							icon: <CommandLineIcon className={icon} />,
							action: {
								label: t('features.apiAccess.actionLabel'),
								href: '/docs/api',
								external: true,
							},
						},
					]}
				/>

				<DynamicVsStatic
					eyebrow={m('eyebrow.comparison')}
					title={t('dynamic.title')}
					subtitle={t('dynamic.subtitle')}
					staticLabel={t('dynamic.staticLabel')}
					staticTitle={t('dynamic.staticTitle')}
					staticPoints={[1, 2, 3].map((n) => t(`dynamic.staticPoint${n}`))}
					dynamicLabel={t('dynamic.dynamicLabel')}
					dynamicTitle={t('dynamic.dynamicTitle')}
					dynamicPoints={[1, 2, 3].map((n) => t(`dynamic.dynamicPoint${n}`))}
					lockInTitle={t('dynamic.lockInTitle')}
					lockInDescription={t('dynamic.lockInDescription')}
					lockInPills={[1, 2, 3].map((n) => t(`dynamic.lockInPill${n}`))}
					lockInCtaLabel={t('dynamic.lockInCtaLabel')}
				/>

				<ProductTestimonial eyebrow={t('testimonial.eyebrow')} testimonial={INHOTEL_TESTIMONIAL} />

				<ProductUseCases
					eyebrow={m('eyebrow.useCases')}
					title={t('useCases.title')}
					subtitle={t('useCases.subtitle')}
					cases={useCases}
					learnMoreLabel={t('useCases.learnMore')}
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
							title: t('crossProducts.analytics.title'),
							description: t('crossProducts.analytics.description'),
							href: '/products/analytics',
							icon: <ChartBarIcon className={icon} />,
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
