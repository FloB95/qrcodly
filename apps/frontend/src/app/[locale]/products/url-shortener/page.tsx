import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductBento } from '@/components/products/ProductBento';
import { UrlShortenerHeroForm } from '@/components/products/UrlShortenerHeroForm';
import { ProductUseCases } from '@/components/products/ProductUseCases';
import { ProductStatsBar } from '@/components/products/ProductStatsBar';
import { DynamicVsStatic } from '@/components/products/DynamicVsStatic';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { BreadcrumbJsonLd, marketingMetadata } from '@/components/marketing/seo';
import {
	UrlShortenerHeroMockup,
	BrandedLinksMockup,
	LinkAnalyticsMockup,
	ApiAccessMockup,
} from '@/components/products/mockups/UrlShortenerMockups';
import {
	QrCodeIcon,
	ChartBarIcon,
	MegaphoneIcon,
	ChatBubbleBottomCenterTextIcon,
	CurrencyDollarIcon,
	ShoppingCartIcon,
	CodeBracketIcon,
	BuildingOffice2Icon,
	TagIcon,
	Squares2X2Icon,
} from '@heroicons/react/24/outline';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';

const PAGE_PATH = 'products/url-shortener';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: 'productsUrlShortener' });
	return marketingMetadata(locale, PAGE_PATH, {
		title: t('metaTitle'),
		description: t('metaDescription'),
	});
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) notFound();

	const t = await getTranslations({ locale, namespace: 'productsUrlShortener' });
	const m = await getTranslations({ locale, namespace: 'marketing' });

	const icon = 'size-5';

	const useCaseIcons = [
		<MegaphoneIcon key="1" className={icon} />,
		<ChatBubbleBottomCenterTextIcon key="2" className={icon} />,
		<CurrencyDollarIcon key="3" className={icon} />,
		<ShoppingCartIcon key="4" className={icon} />,
		<CodeBracketIcon key="5" className={icon} />,
		<BuildingOffice2Icon key="6" className={icon} />,
	];

	const useCaseSlugs = [
		'marketing-teams',
		'social-media',
		'sales',
		'e-commerce',
		'developers',
		'agencies',
	];

	const useCases = useCaseSlugs.map((slug, i) => ({
		icon: useCaseIcons[i],
		title: t(`useCases.case${i + 1}Title`),
		description: t(`useCases.case${i + 1}Description`),
		href: `/products/url-shortener/${slug}`,
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
					visual={<UrlShortenerHeroMockup />}
				>
					<UrlShortenerHeroForm />
				</ProductHeroSection>

				<ProductStatsBar
					eyebrow={m('eyebrow.numbers')}
					title={t('facts.title')}
					stats={[1, 2, 3, 4].map((n) => ({
						value: t(`facts.fact${n}Value`),
						label: t(`facts.fact${n}Label`),
					}))}
				/>

				<ProductBento
					eyebrow={m('eyebrow.features')}
					title={t('features.title')}
					tiles={[
						{
							title: t('features.brandedLinks.title'),
							description: t('features.brandedLinks.description'),
							span: 4,
							visual: <BrandedLinksMockup />,
						},
						{
							title: t('features.management.title'),
							description: t('features.management.description'),
							span: 2,
							dark: true,
							icon: <TagIcon className={icon} />,
						},
						{
							title: t('features.bulkOperations.title'),
							description: t('features.bulkOperations.description'),
							span: 2,
							icon: <Squares2X2Icon className={icon} />,
						},
						{
							title: t('features.analytics.title'),
							description: t('features.analytics.description'),
							span: 4,
							visual: <LinkAnalyticsMockup />,
						},
						{
							title: t('features.apiAccess.title'),
							description: t('features.apiAccess.description'),
							span: 6,
							visual: <ApiAccessMockup />,
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
							title: t('crossProducts.qrCodes.title'),
							description: t('crossProducts.qrCodes.description'),
							href: '/products/qr-codes',
							icon: <QrCodeIcon className={icon} />,
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
					ctaHref="/dashboard/short-urls"
				/>
			</article>
			<Footer />
		</>
	);
}
