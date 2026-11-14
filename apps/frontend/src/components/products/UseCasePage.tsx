import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Container from '@/components/ui/container';
import { ProductHeroSection } from '@/components/products/ProductHeroSection';
import { ProductBento, type BentoTile } from '@/components/products/ProductBento';
import { ProductStepByStep } from '@/components/products/ProductStepByStep';
import { ProductTipGrid } from '@/components/products/ProductTipGrid';
import { ProductUseCases } from '@/components/products/ProductUseCases';
import { CrossProductCards } from '@/components/products/CrossProductCards';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { TemplatePhone } from '@/components/products/hosted-pages/TemplatePhone';
import { demoPath } from '@/components/products/hosted-pages/template-sample';
import { BrandQr } from '@/components/products/mockups/BrandQr';
import { Eyebrow } from '@/components/marketing/SectionHead';
import { BreadcrumbJsonLd } from '@/components/marketing/seo';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { HowToJsonLd } from '@/components/seo/HowToJsonLd';
import { buildUseCaseVisual } from '@/components/products/mockups/buildUseCaseVisual';
import { getSiblingUseCases, type UseCaseDef } from '@/lib/use-case-pages';
import { Link } from '@/i18n/navigation';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
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
	/** Namespace of the parent product page — sibling and analytics card copy is reused from there. */
	parentNamespace: string;
	siblingIndexMap: Record<string, number>;
	crossProductCards: Array<{ key: string; href: string; icon: ReactNode }>;
	renderSiblingIcon: (useCase: UseCaseDef) => ReactNode;
}) {
	const t = await getTranslations({ locale, namespace: useCase.namespace });
	const parentT = await getTranslations({ locale, namespace: parentNamespace });
	const m = await getTranslations({ locale, namespace: 'marketing' });
	const tDemo = await getTranslations({ locale, namespace: 'hostedDemo.gallery' });
	const tTemplates = await getTranslations({
		locale,
		namespace: 'generator.contentSwitch.hosted.templates',
	});

	const caseTitle = parentT(`useCases.case${siblingIndexMap[useCase.slug] ?? 1}Title`);
	const pagePath = `${useCase.parentPath.slice(1)}/${useCase.slug}`;

	// With a PDF template the phone carries the hero, so every feature keeps its mockup.
	// Without one, the first mockup moves into the hero and its tile stays text-only.
	const heroFromFeature = !useCase.template;
	const count = useCase.visuals.length;
	const spans: BentoTile['span'][] = heroFromFeature
		? ([2, 4, 6] as const).slice(0, count)
		: Array.from({ length: count }, () => (count === 1 ? 6 : 3) as BentoTile['span']);
	const tiles: BentoTile[] = useCase.visuals.map((spec, i) => ({
		title: t(`features.feature${i + 1}.title`),
		description: t(`features.feature${i + 1}.description`),
		span: spans[i] ?? 6,
		dark: heroFromFeature && i === 0,
		visual: heroFromFeature && i === 0 ? undefined : buildUseCaseVisual(spec, t, i),
	}));

	const firstVisual = useCase.visuals[0];
	const heroVisual = useCase.template ? (
		// as tall as the phone, so the hero grid centres the phone itself next to the text;
		// zoomed down while the two-column hero is narrower than the 480px scene
		<div className="relative mx-auto h-[540px] w-full max-w-[480px] lg:[zoom:0.875] xl:[zoom:1]">
			{/* the printed code, scanned into the page on the phone */}
			<div
				className="absolute top-[250px] left-0 hidden w-[172px] -rotate-6 rounded-2xl bg-white p-4 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.55)] ring-1 ring-stone-200/70 sm:block"
				aria-hidden="true"
			>
				<span className="block truncate font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
					{tTemplates(`${useCase.template}.name`)}
				</span>
				<BrandQr className="mt-3 size-[140px] text-slate-900" />
			</div>
			<svg
				width="120"
				height="80"
				viewBox="0 0 120 80"
				className="absolute top-[170px] left-[92px] hidden sm:block"
				aria-hidden="true"
			>
				<path
					d="M4 70 C 40 70, 70 40, 108 14"
					fill="none"
					stroke="#0f172a"
					strokeWidth="2"
					strokeDasharray="5 6"
				/>
				<path d="M98 10 L110 13 L104 24" fill="none" stroke="#0f172a" strokeWidth="2" />
			</svg>
			<div className="absolute top-0 left-1/2 h-[540px] w-[270px] -translate-x-1/2 sm:right-0 sm:left-auto sm:translate-x-0">
				<TemplatePhone
					locale={locale}
					template={useCase.template}
					scale={0.72}
					className="h-full w-full"
				/>
				{/* a layer, not a wrapper: the page in the phone has links of its own */}
				<Link
					href={demoPath(useCase.template)}
					aria-label={tDemo('openDemo', { name: tTemplates(`${useCase.template}.name`) })}
					className="absolute inset-0 rounded-[44px]"
				/>
			</div>
		</div>
	) : firstVisual ? (
		buildUseCaseVisual(firstVisual, t, 0)
	) : undefined;

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

	// The analytics card describes the same product everywhere, so its copy lives with the parent.
	const crossT = (key: string) => (key === 'analytics' ? parentT : t);

	return (
		<>
			<Header />
			<article className="text-slate-900">
				<FaqJsonLd items={faqItems} />
				<HowToJsonLd
					name={t('steps.title')}
					steps={steps.map((s) => ({ name: s.title, text: s.description }))}
				/>
				<BreadcrumbJsonLd
					locale={locale}
					items={[
						{ name: parentT('badge'), path: useCase.parentPath.slice(1) },
						{ name: caseTitle, path: pagePath },
					]}
				/>

				<ProductHeroSection
					eyebrow={`${parentT('badge')} · ${caseTitle}`}
					title={t('hero.title')}
					subtitle={t('hero.subtitle')}
					ctaLabel={t('hero.ctaLabel')}
					ctaHref="/#generator"
					secondaryCtaLabel={useCase.template ? tDemo('demo') : undefined}
					secondaryCtaHref={useCase.template ? demoPath(useCase.template) : undefined}
					visual={heroVisual}
				/>

				<ProductBento tiles={tiles} />

				{useCase.template && (
					<Container>
						<div className="sm:px-6 lg:px-8">
							<Link
								href="/products/hosted-pages/pdf"
								className="group flex flex-col gap-5 rounded-[22px] bg-linear-to-br from-slate-900 to-slate-800 p-7 text-white sm:p-9 lg:flex-row lg:items-center lg:justify-between"
							>
								<span className="flex max-w-2xl flex-col gap-1.5">
									<Eyebrow className="text-amber-400">{m('pdfBanner.eyebrow')}</Eyebrow>
									<span className="text-2xl font-bold tracking-tight text-balance">
										{m('pdfBanner.title')}
									</span>
									<span className="text-[15px] leading-relaxed text-slate-300">
										{m('pdfBanner.text')}
									</span>
								</span>
								<span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-900 lg:self-auto">
									{m('pdfBanner.cta')}
									<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
								</span>
							</Link>
						</div>
					</Container>
				)}

				<ProductStepByStep
					eyebrow={m('eyebrow.howItWorks')}
					title={t('steps.title')}
					subtitle={t('steps.subtitle')}
					steps={steps}
				/>

				<ProductTipGrid eyebrow={m('eyebrow.tips')} title={t('tips.title')} tips={tips} />

				<ProductUseCases
					eyebrow={m('eyebrow.useCases')}
					title={t('relatedUseCases.title')}
					subtitle={t('relatedUseCases.subtitle')}
					cases={siblingCases}
					learnMoreLabel={t('relatedUseCases.learnMore')}
				/>

				<CrossProductCards
					title={t('crossProducts.title')}
					cards={crossProductCards.map((card) => ({
						title: crossT(card.key)(`crossProducts.${card.key}.title`),
						description: crossT(card.key)(`crossProducts.${card.key}.description`),
						href: card.href,
						icon: card.icon,
					}))}
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
