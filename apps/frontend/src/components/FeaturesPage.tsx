import Container from '@/components/ui/container';
import { CheckIcon } from '@heroicons/react/24/outline';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { CtaSection } from './CtaSection';
import { AnimateOnLoad, AnimateOnScroll } from './features/AnimateOnScroll';
import {
	AnalyticsMockup,
	BulkOperationsMockup,
	CollectionMockup,
	ContentTypesMockup,
	CustomDomainMockup,
	DynamicQrMockup,
	SecurityMockup,
	TagsMockup,
	TemplatesMockup,
} from './features/FeatureMockups';

/* ─── Feature Detail Section ──────────────────────────── */

function FeatureDetailSection({
	title,
	description,
	bullets,
	visual,
	reversed,
}: {
	title: string;
	description: string;
	bullets: string[];
	visual: ReactNode;
	reversed?: boolean;
}) {
	return (
		<div className="py-12 sm:py-20">
			<Container>
				<div
					className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-10 sm:gap-12 lg:gap-16 sm:px-6 lg:px-8`}
				>
					{/* Text side */}
					<AnimateOnScroll
						className="flex-1 max-w-xl"
						variant={reversed ? 'slideRight' : 'slideLeft'}
						delay={0.1}
					>
						<h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900 mb-4">
							{title}
						</h2>
						<p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-6">
							{description}
						</p>
						<ul className="space-y-3">
							{bullets.map((bullet) => (
								<li key={bullet} className="flex items-start gap-3">
									<CheckIcon className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
									<span className="text-slate-700 text-sm sm:text-base">{bullet}</span>
								</li>
							))}
						</ul>
					</AnimateOnScroll>

					{/* Visual side */}
					<AnimateOnScroll
						className="flex-1 w-full max-w-lg lg:max-w-none"
						variant={reversed ? 'slideLeft' : 'slideRight'}
						delay={0.2}
					>
						{visual}
					</AnimateOnScroll>
				</div>
			</Container>
		</div>
	);
}

/* ─── Main Component ──────────────────────────────────── */

export async function FeaturesPage({ locale }: { locale: string }) {
	const t = await getTranslations({ locale, namespace: 'featuresPage' });

	const spotlightSections = [
		{
			title: t('spotlight.dynamicQr.title'),
			description: t('spotlight.dynamicQr.description'),
			bullets: [
				t('spotlight.dynamicQr.bullet1'),
				t('spotlight.dynamicQr.bullet2'),
				t('spotlight.dynamicQr.bullet3'),
			],
			visual: <DynamicQrMockup />,
		},
		{
			title: t('spotlight.analytics.title'),
			description: t('spotlight.analytics.description'),
			bullets: [
				t('spotlight.analytics.bullet1'),
				t('spotlight.analytics.bullet2'),
				t('spotlight.analytics.bullet3'),
			],
			visual: <AnalyticsMockup />,
		},
		{
			title: t('spotlight.collection.title'),
			description: t('spotlight.collection.description'),
			bullets: [
				t('spotlight.collection.bullet1'),
				t('spotlight.collection.bullet2'),
				t('spotlight.collection.bullet3'),
			],
			visual: <CollectionMockup />,
		},
		{
			title: t('spotlight.templates.title'),
			description: t('spotlight.templates.description'),
			bullets: [
				t('spotlight.templates.bullet1'),
				t('spotlight.templates.bullet2'),
				t('spotlight.templates.bullet3'),
			],
			visual: <TemplatesMockup />,
		},
		{
			title: t('spotlight.customDomain.title'),
			description: t('spotlight.customDomain.description'),
			bullets: [
				t('spotlight.customDomain.bullet1'),
				t('spotlight.customDomain.bullet2'),
				t('spotlight.customDomain.bullet3'),
			],
			visual: <CustomDomainMockup />,
		},
		{
			title: t('spotlight.tags.title'),
			description: t('spotlight.tags.description'),
			bullets: [
				t('spotlight.tags.bullet1'),
				t('spotlight.tags.bullet2'),
				t('spotlight.tags.bullet3'),
			],
			visual: <TagsMockup />,
		},
		{
			title: t('spotlight.bulkOperations.title'),
			description: t('spotlight.bulkOperations.description'),
			bullets: [
				t('spotlight.bulkOperations.bullet1'),
				t('spotlight.bulkOperations.bullet2'),
				t('spotlight.bulkOperations.bullet3'),
			],
			visual: <BulkOperationsMockup />,
		},
		{
			title: t('spotlight.contentTypes.title'),
			description: t('spotlight.contentTypes.description'),
			bullets: [
				t('spotlight.contentTypes.bullet1'),
				t('spotlight.contentTypes.bullet2'),
				t('spotlight.contentTypes.bullet3'),
			],
			visual: <ContentTypesMockup />,
		},
		{
			title: t('spotlight.security.title'),
			description: t('spotlight.security.description'),
			bullets: [
				t('spotlight.security.bullet1'),
				t('spotlight.security.bullet2'),
				t('spotlight.security.bullet3'),
			],
			visual: <SecurityMockup />,
		},
	];

	return (
		<>
			{/* Hero Section */}
			<Container>
				<div className="pt-16 sm:pt-20 pb-16 sm:pb-24 text-center sm:px-6 lg:px-8">
					<AnimateOnLoad className="mt-14">
						<h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto">
							{t('title')}
						</h1>
					</AnimateOnLoad>

					<AnimateOnLoad delay={0.2}>
						<p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-700">{t('subtitle')}</p>
					</AnimateOnLoad>
				</div>
			</Container>

			{/* Spotlight Sections */}
			{spotlightSections.map((section, i) => (
				<FeatureDetailSection
					key={section.title}
					title={section.title}
					description={section.description}
					bullets={section.bullets}
					visual={section.visual}
					reversed={i % 2 === 1}
				/>
			))}

			<CtaSection />
		</>
	);
}
