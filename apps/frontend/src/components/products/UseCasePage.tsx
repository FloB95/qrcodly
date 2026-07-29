import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductFeatureSection } from '@/components/products/ProductFeatureSection';
import { ProductStepByStep } from '@/components/products/ProductStepByStep';
import { ProductTipGrid } from '@/components/products/ProductTipGrid';
import { ProductUseCases } from '@/components/products/ProductUseCases';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { HowToJsonLd } from '@/components/seo/HowToJsonLd';
import { buildUseCaseVisual } from '@/components/products/mockups/buildUseCaseVisual';
import { getSiblingUseCases, type UseCaseDef } from '@/lib/use-case-pages';
import { getTranslations } from 'next-intl/server';
import type { SupportedLanguages } from '@/i18n/routing';
import type { ReactNode } from 'react';

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;

export async function UseCasePage({
	locale,
	useCase,
	collection,
	parentNamespace,
	siblingIndexMap,
	crossProductCards,
	renderSiblingIcon,
}: {
	locale: SupportedLanguages;
	useCase: UseCaseDef;
	collection: UseCaseDef[];
	/** Namespace of the parent product page — sibling card copy is reused from there. */
	parentNamespace: string;
	siblingIndexMap: Record<string, number>;
	crossProductCards: Array<{ key: string; href: string; icon: ReactNode }>;
	renderSiblingIcon: (useCase: UseCaseDef) => ReactNode;
}) {
	const t = await getTranslations({ locale, namespace: useCase.namespace });
	const parentT = await getTranslations({ locale, namespace: parentNamespace });

	const features = useCase.visuals.map((spec, i) => {
		const n = i + 1;
		return {
			title: t(`features.feature${n}.title`),
			description: t(`features.feature${n}.description`),
			bullets: [
				t(`features.feature${n}.bullet1`),
				t(`features.feature${n}.bullet2`),
				t(`features.feature${n}.bullet3`),
			],
			visual: buildUseCaseVisual(spec, t, i),
		};
	});

	const steps = STEP_KEYS.filter((key) => t.has(`steps.${key}.title`)).map((key) => ({
		title: t(`steps.${key}.title`),
		description: t(`steps.${key}.description`),
	}));

	const tips = [1, 2, 3, 4].map((n) => ({
		title: t(`tips.tip${n}.title`),
		description: t(`tips.tip${n}.description`),
	}));

	const faqItems = Array.from({ length: 5 }, (_, i) => `faq.q${i + 1}`)
		.filter((key) => t.has(key))
		.map((key, i) => ({ question: t(key), answer: t(`faq.a${i + 1}`) }));

	const siblingCases = getSiblingUseCases(useCase.slug, collection).map((sibling) => ({
		icon: renderSiblingIcon(sibling),
		title: parentT(`useCases.case${siblingIndexMap[sibling.slug] ?? 1}Title`),
		description: parentT(`useCases.case${siblingIndexMap[sibling.slug] ?? 1}Description`),
		href: `${sibling.parentPath}/${sibling.slug}`,
	}));

	return (
		<>
			<Header />
			<article>
				<FaqJsonLd items={faqItems} />
				<HowToJsonLd
					name={t('steps.title')}
					steps={steps.map((s) => ({ name: s.title, text: s.description }))}
				/>

				<ProductHeroSection
					title={t('hero.title')}
					subtitle={t('hero.subtitle')}
					ctaLabel={t('hero.ctaLabel')}
					ctaHref="/#generator"
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

				<ProductStepByStep title={t('steps.title')} subtitle={t('steps.subtitle')} steps={steps} />

				<ProductTipGrid title={t('tips.title')} tips={tips} />

				<CrossProductCards
					title={t('crossProducts.title')}
					cards={crossProductCards.map((card) => ({
						title: t(`crossProducts.${card.key}.title`),
						description: t(`crossProducts.${card.key}.description`),
						href: card.href,
						icon: card.icon,
					}))}
				/>

				<ProductUseCases
					title={t('relatedUseCases.title')}
					subtitle={t('relatedUseCases.subtitle')}
					cases={siblingCases}
					learnMoreLabel={t('relatedUseCases.learnMore')}
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
