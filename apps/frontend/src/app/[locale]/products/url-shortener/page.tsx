import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductFeatureSection } from '@/components/products/ProductFeatureSection';
import { UrlShortenerHeroForm } from '@/components/products/UrlShortenerHeroForm';

import { ProductUseCases } from '@/components/products/ProductUseCases';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';

import {
	BrandedLinksMockup,
	LinkAnalyticsMockup,
	LinkManagementMockup,
	BulkOperationsMockup,
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
} from '@heroicons/react/24/outline';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';
import { env } from '@/env';

const PAGE_PATH = 'products/url-shortener';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: 'productsUrlShortener' });
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
					routing.locales.map((l) => [
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

	const t = await getTranslations({ locale, namespace: 'productsUrlShortener' });

	const features = [
		{
			title: t('features.brandedLinks.title'),
			description: t('features.brandedLinks.description'),
			bullets: [
				t('features.brandedLinks.bullet1'),
				t('features.brandedLinks.bullet2'),
				t('features.brandedLinks.bullet3'),
			],
			visual: <BrandedLinksMockup />,
		},
		{
			title: t('features.analytics.title'),
			description: t('features.analytics.description'),
			bullets: [
				t('features.analytics.bullet1'),
				t('features.analytics.bullet2'),
				t('features.analytics.bullet3'),
			],
			visual: <LinkAnalyticsMockup />,
		},
		{
			title: t('features.management.title'),
			description: t('features.management.description'),
			bullets: [
				t('features.management.bullet1'),
				t('features.management.bullet2'),
				t('features.management.bullet3'),
			],
			visual: <LinkManagementMockup />,
		},
		{
			title: t('features.bulkOperations.title'),
			comingSoon: t('features.bulkOperations.comingSoon'),
			description: t('features.bulkOperations.description'),
			bullets: [
				t('features.bulkOperations.bullet1'),
				t('features.bulkOperations.bullet2'),
				t('features.bulkOperations.bullet3'),
			],
			visual: <BulkOperationsMockup />,
		},
		{
			title: t('features.apiAccess.title'),
			description: t('features.apiAccess.description'),
			bullets: [
				t('features.apiAccess.bullet1'),
				t('features.apiAccess.bullet2'),
				t('features.apiAccess.bullet3'),
			],
			visual: <ApiAccessMockup />,
			actionButton: {
				label: t('features.apiAccess.actionLabel'),
				href: '/docs/api',
				external: true,
			},
		},
	];

	const useCaseIcons = [
		<MegaphoneIcon key="1" className="h-5 w-5" />,
		<ChatBubbleBottomCenterTextIcon key="2" className="h-5 w-5" />,
		<CurrencyDollarIcon key="3" className="h-5 w-5" />,
		<ShoppingCartIcon key="4" className="h-5 w-5" />,
		<CodeBracketIcon key="5" className="h-5 w-5" />,
		<BuildingOffice2Icon key="6" className="h-5 w-5" />,
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
				<ProductHeroSection title={t('hero.title')} subtitle={t('hero.subtitle')}>
					<UrlShortenerHeroForm />
				</ProductHeroSection>

				{features.map((feature, i) => (
					<ProductFeatureSection
						key={feature.title}
						title={feature.title}
						description={feature.description}
						bullets={feature.bullets}
						visual={feature.visual}
						reversed={i % 2 === 1}
						comingSoon={feature.comingSoon}
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
							title: t('crossProducts.qrCodes.title'),
							description: t('crossProducts.qrCodes.description'),
							href: '/products/qr-codes',
							icon: <QrCodeIcon className="h-5 w-5 sm:h-6 sm:w-6" />,
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
			</article>
			<Footer />
		</>
	);
}
