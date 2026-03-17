import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductFeatureSection } from '@/components/products/ProductFeatureSection';
import { ProductStatsBar } from '@/components/products/ProductStatsBar';
import { ProductStepByStep } from '@/components/products/ProductStepByStep';
import { ProductTipGrid } from '@/components/products/ProductTipGrid';
import { ProductUseCases } from '@/components/products/ProductUseCases';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { HowToJsonLd } from '@/components/seo/HowToJsonLd';
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
	const { layoutTemplate, featureCount, hasStats, hasTips } = useCase;

	const features = Array.from({ length: featureCount }, (_, i) => {
		const n = i + 1;
		return {
			title: t(`features.feature${n}.title`),
			description: t(`features.feature${n}.description`),
			bullets: [
				t(`features.feature${n}.bullet1`),
				t(`features.feature${n}.bullet2`),
				t(`features.feature${n}.bullet3`),
			],
			visual: (
				<UseCaseVisual
					imageUrl={useCase.featureImages[i]!}
					alt={t(`features.feature${n}.title`)}
					theme={FEATURE_THEMES[i % FEATURE_THEMES.length]}
				/>
			),
		};
	});

	const siblings = getSiblingUseCases(slug, QR_CODE_USE_CASES);

	const faqItems = Array.from({ length: 4 }, (_, i) => ({
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

	// Steps data (all templates have it)
	const stepKeys = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;
	const steps = stepKeys
		.filter((key) => t.has(`steps.${key}.title`))
		.map((key) => ({
			title: t(`steps.${key}.title`),
			description: t(`steps.${key}.description`),
		}));

	const howToSteps = steps.map((s) => ({ name: s.title, text: s.description }));

	// Stats data (only for hands-on and data-driven)
	const stats = hasStats
		? [1, 2, 3, 4].map((n) => ({
				value: t(`stats.stat${n}Value`),
				label: t(`stats.stat${n}Label`),
			}))
		: null;

	// Tips data (only for hands-on and data-driven)
	const tips = hasTips
		? [1, 2, 3, 4].map((n) => ({
				title: t(`tips.tip${n}.title`),
				description: t(`tips.tip${n}.description`),
			}))
		: null;

	const crossProducts = (
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
	);

	const useCasesSection = (
		<ProductUseCases
			title={t('relatedUseCases.title')}
			subtitle={t('relatedUseCases.subtitle')}
			cases={siblingCases}
			learnMoreLabel={t('relatedUseCases.learnMore')}
		/>
	);

	const faqSection = (
		<ProductFaqSection title={t('faq.title')} items={faqItems} viewAllLabel={t('faq.viewAll')} />
	);

	const ctaSection = (
		<ProductCtaSection
			title={t('cta.title')}
			subtitle={t('cta.subtitle')}
			ctaLabel={t('cta.ctaLabel')}
			ctaHref="/#generator"
		/>
	);

	return (
		<>
			<Header />
			<article>
				<FaqJsonLd items={faqItems} />
				<HowToJsonLd name={t('steps.title')} steps={howToSteps} />

				<ProductHeroSection
					title={t('hero.title')}
					subtitle={t('hero.subtitle')}
					ctaLabel={t('hero.ctaLabel')}
					ctaHref="/#generator"
				/>

				{layoutTemplate === 'hands-on' && (
					<>
						{stats && <ProductStatsBar stats={stats} />}
						<ProductStepByStep
							title={t('steps.title')}
							subtitle={t('steps.subtitle')}
							steps={steps}
						/>
						{features.map((f, i) => (
							<ProductFeatureSection
								key={f.title}
								title={f.title}
								description={f.description}
								bullets={f.bullets}
								visual={f.visual}
								reversed={i % 2 === 1}
							/>
						))}
						{tips && <ProductTipGrid title={t('tips.title')} tips={tips} />}
						{useCasesSection}
						{crossProducts}
						{faqSection}
						{ctaSection}
					</>
				)}

				{layoutTemplate === 'data-driven' && (
					<>
						{features.map((f, i) => (
							<ProductFeatureSection
								key={f.title}
								title={f.title}
								description={f.description}
								bullets={f.bullets}
								visual={f.visual}
								reversed={i % 2 === 1}
							/>
						))}
						{stats && <ProductStatsBar stats={stats} />}
						<ProductStepByStep
							title={t('steps.title')}
							subtitle={t('steps.subtitle')}
							steps={steps}
						/>
						{tips && <ProductTipGrid title={t('tips.title')} tips={tips} />}
						{useCasesSection}
						{crossProducts}
						{faqSection}
						{ctaSection}
					</>
				)}

				{layoutTemplate === 'technical' && (
					<>
						{features.map((f, i) => (
							<ProductFeatureSection
								key={f.title}
								title={f.title}
								description={f.description}
								bullets={f.bullets}
								visual={f.visual}
								reversed={i % 2 === 1}
							/>
						))}
						<ProductStepByStep
							title={t('steps.title')}
							subtitle={t('steps.subtitle')}
							steps={steps}
						/>
						{useCasesSection}
						{crossProducts}
						{faqSection}
						{ctaSection}
					</>
				)}
			</article>
			<Footer />
		</>
	);
}
