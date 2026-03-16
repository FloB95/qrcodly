import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductFeatureSection } from '@/components/products/ProductFeatureSection';
import { ProductUseCases } from '@/components/products/ProductUseCases';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { UseCaseVisual } from '@/components/products/mockups/UseCaseVisual';
import type { ColorTheme } from '@/components/products/mockups/UseCaseVisual';
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
import {
	QR_CODE_USE_CASES,
	getUseCaseBySlug,
	getSiblingUseCases,
	type UseCaseIconName,
} from '@/lib/use-case-pages';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';
import { env } from '@/env';
import type { SupportedLanguages } from '@/i18n/routing';

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
	BuildingStorefrontIcon,
	ShoppingBagIcon,
	TicketIcon,
	HomeModernIcon,
	AcademicCapIcon,
	MegaphoneIcon,
};

function renderIcon(name: UseCaseIconName) {
	const Icon = ICON_COMPONENTS[name];
	return Icon ? <Icon className="h-5 w-5" /> : null;
}

const FEATURE_THEMES: ColorTheme[] = ['amber', 'blue', 'emerald'];

type PageParams = {
	params: Promise<{ locale: SupportedLanguages; slug: string }>;
};

export async function generateStaticParams() {
	return QR_CODE_USE_CASES.flatMap((uc) =>
		SUPPORTED_LANGUAGES.map((locale) => ({ locale, slug: uc.slug })),
	);
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
	const { locale, slug } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};

	const useCase = getUseCaseBySlug(slug, QR_CODE_USE_CASES);
	if (!useCase) return {};

	const t = await getTranslations({ locale, namespace: useCase.namespace });
	const baseUrl = env.NEXT_PUBLIC_FRONTEND_URL;
	const pagePath = `products/qr-codes/${slug}`;

	return {
		title: t('metaTitle'),
		description: t('metaDescription'),
		alternates: {
			canonical:
				locale === routing.defaultLocale
					? `${baseUrl}/${pagePath}`
					: `${baseUrl}/${locale}/${pagePath}`,
			languages: {
				'x-default': `${baseUrl}/${pagePath}`,
				...Object.fromEntries(
					routing.locales
						.filter((l) => l !== locale)
						.map((l) => [
							l,
							l === routing.defaultLocale
								? `${baseUrl}/${pagePath}`
								: `${baseUrl}/${l}/${pagePath}`,
						]),
				),
			},
		},
	};
}

export default async function Page({ params }: PageParams) {
	const { locale, slug } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) notFound();

	const useCase = getUseCaseBySlug(slug, QR_CODE_USE_CASES);
	if (!useCase) notFound();

	const t = await getTranslations({ locale, namespace: useCase.namespace });

	const features = [1, 2, 3].map((n) => ({
		title: t(`features.feature${n}.title`),
		description: t(`features.feature${n}.description`),
		bullets: [
			t(`features.feature${n}.bullet1`),
			t(`features.feature${n}.bullet2`),
			t(`features.feature${n}.bullet3`),
		],
		visual: (
			<UseCaseVisual
				imageUrl={useCase.featureImages[n - 1]!}
				alt={t(`features.feature${n}.title`)}
				theme={FEATURE_THEMES[(n - 1) % FEATURE_THEMES.length]}
			/>
		),
	}));

	const siblings = getSiblingUseCases(slug, QR_CODE_USE_CASES);

	const faqItems = Array.from({ length: 6 }, (_, i) => ({
		question: t(`faq.q${i + 1}`),
		answer: t(`faq.a${i + 1}`),
	}));

	const parentT = await getTranslations({ locale, namespace: 'productsQrCodes' });
	const caseIndexMap: Record<string, number> = {
		restaurants: 1,
		retail: 2,
		events: 3,
		'real-estate': 4,
		education: 5,
		marketing: 6,
	};
	const siblingCases = siblings.map((s) => {
		const idx = caseIndexMap[s.slug] ?? 1;
		return {
			icon: renderIcon(s.iconName),
			title: parentT(`useCases.case${idx}Title`),
			description: parentT(`useCases.case${idx}Description`),
			href: `${s.parentPath}/${s.slug}`,
		};
	});

	return (
		<>
			<Header />
			<article>
				<FaqJsonLd items={faqItems} />

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
					/>
				))}

				<ProductUseCases
					title={t('relatedUseCases.title')}
					subtitle={t('relatedUseCases.subtitle')}
					cases={siblingCases}
					learnMoreLabel={t('relatedUseCases.learnMore')}
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
