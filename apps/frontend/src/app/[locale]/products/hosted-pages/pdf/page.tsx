import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowPathIcon, ArrowRightIcon, CubeIcon } from '@heroicons/react/24/outline';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Container from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { DefaultPageParams } from '@/types/page';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { TemplatePhone } from '@/components/products/hosted-pages/TemplatePhone';
import { TemplateGallery } from '@/components/products/hosted-pages/TemplateGallery';
import { CtaQrMotif } from '@/components/products/CtaQrMotif';
import { BreadcrumbJsonLd, marketingMetadata } from '@/components/marketing/seo';
import { Check, Eyebrow, SectionHead, cardClass } from '@/components/marketing/SectionHead';

const PAGE_PATH = 'products/hosted-pages/pdf';
const NAMESPACE = 'productsHostedPdf';
/** Opens the generator on a PDF page, with the restaurant template as the preview example */
const CREATE_HREF = '/?type=pdf&sample=restaurantMenu#generator';
const FAQ_COUNT = 5;

const GALLERY = [
	'restaurantMenu',
	'cafeBar',
	'realEstate',
	'brochure',
	'eventProgram',
	'priceList',
] as const;

/** Solution pages that already explain these industries; the chips lead there. */
const SOLUTIONS = [
	['restaurants', 'restaurants'],
	['real-estate', 'realEstate'],
	['events', 'events'],
	['retail', 'retail'],
	['marketing', 'marketing'],
] as const;

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: NAMESPACE });
	return marketingMetadata(locale, PAGE_PATH, {
		title: t('metaTitle'),
		description: t('metaDescription'),
	});
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) notFound();
	const t = await getTranslations({ locale, namespace: NAMESPACE });

	const faqItems = Array.from({ length: FAQ_COUNT }, (_, i) => ({
		question: t(`faq.q${i + 1}`),
		answer: t(`faq.a${i + 1}`),
	}));
	const facts = [1, 2, 3, 4].map((n) => ({
		title: t(`facts.f${n}Title`),
		text: t(`facts.f${n}Text`),
	}));

	return (
		<>
			<Header />
			<FaqJsonLd items={faqItems} />
			<BreadcrumbJsonLd locale={locale} items={[{ name: t('breadcrumb'), path: PAGE_PATH }]} />
			<article className="text-slate-900">
				{/* Hero */}
				<Container>
					<div className="grid grid-cols-1 items-center gap-14 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:pb-24">
						<div className="flex flex-col gap-6">
							<span className="inline-flex items-center gap-2 self-start rounded-full border border-stone-200 bg-white py-1.5 pr-3.5 pl-1.5 text-[13px] font-semibold shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)]">
								<span className="rounded-full bg-[#7a3b12] px-2.5 py-0.5 text-[11px] tracking-wide text-amber-200">
									{t('hero.badge')}
								</span>
								{t('hero.audience')}
							</span>
							<h1 className="text-4xl leading-[1.04] font-extrabold tracking-[-0.04em] sm:text-6xl">
								{t('hero.title')}
							</h1>
							<p className="max-w-xl text-lg leading-relaxed text-slate-600">
								{t('hero.subtitle')}
							</p>
							<div className="flex flex-wrap gap-3">
								<Link
									href={CREATE_HREF}
									className="rounded-xl bg-slate-900 px-6 py-3.5 font-semibold text-white shadow-[0_14px_30px_-14px_rgba(15,23,42,0.7)] transition hover:bg-slate-800"
								>
									{t('hero.cta')}
								</Link>
								<a
									href="#vorlagen"
									className="rounded-xl border border-stone-200 bg-white/70 px-5 py-3.5 font-semibold transition hover:bg-white"
								>
									{t('hero.secondary')}
								</a>
							</div>
							<ul className="flex flex-wrap gap-2" aria-label={t('hero.useCasesLabel')}>
								{SOLUTIONS.map(([slug, key]) => (
									<li key={slug}>
										<Link
											href={`/products/qr-codes/${slug}`}
											className="inline-block rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-[13px] font-medium transition hover:border-slate-400"
										>
											{t(`hero.useCases.${key}`)}
										</Link>
									</li>
								))}
							</ul>
						</div>

						<div className="relative mx-auto h-[580px] w-full max-w-[520px]">
							<div
								className="absolute top-[120px] left-2 hidden h-[300px] w-[230px] -rotate-[7deg] flex-col gap-2.5 rounded-[18px] bg-white p-5 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.5)] sm:flex"
								aria-hidden="true"
							>
								<span className="font-serif text-xl text-[#7a3b12]">{t('hero.sideDocument')}</span>
								<span className="h-px bg-stone-200" />
								{['w-4/5', 'w-2/3', 'w-3/4', 'w-1/2', 'w-3/5'].map((width) => (
									<span key={width} className={`h-2 rounded bg-stone-200 ${width}`} />
								))}
								<span className="mt-auto self-start rounded-md border border-stone-200 px-2 py-0.5 font-mono text-[10px] text-stone-400">
									PDF · 1,2 MB
								</span>
							</div>
							<TemplatePhone
								locale={locale}
								template="restaurantMenu"
								scale={0.72}
								className="absolute top-0 right-1/2 h-[580px] w-[280px] translate-x-1/2 sm:right-6 sm:translate-x-0"
							/>
							<div className="absolute right-0 bottom-10 hidden items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-[13px] shadow-[0_20px_40px_-20px_rgba(15,23,42,0.45)] sm:flex">
								<span className="flex size-8 items-center justify-center rounded-[9px] bg-emerald-50">
									<ArrowPathIcon className="size-4 text-emerald-600" aria-hidden="true" />
								</span>
								<span className="flex flex-col">
									<span className="font-semibold">{t('hero.toastTitle')}</span>
									<span className="text-slate-500">{t('hero.toastText')}</span>
								</span>
							</div>
						</div>
					</div>
				</Container>

				<Container>
					{/* Swap and open mode */}
					<section className="grid grid-cols-1 gap-5 px-4 pt-6 sm:px-6 md:grid-cols-2">
						<div className={`${cardClass} flex flex-col gap-6 p-6 sm:p-8`}>
							<div className="flex flex-col gap-2">
								<Eyebrow>{t('swap.label')}</Eyebrow>
								<h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
									{t('swap.title')}
								</h2>
								<p className="text-[15px] leading-relaxed text-slate-600">{t('swap.text')}</p>
							</div>
							<div className="flex items-center gap-3.5" aria-hidden="true">
								<div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border border-slate-200 p-3.5 opacity-60">
									<span className="text-[13px] break-all font-semibold line-through">
										{t('swap.oldFile')}
									</span>
									<span className="font-mono text-[11px] text-slate-400">{t('swap.oldUntil')}</span>
								</div>
								<ArrowRightIcon className="size-6 shrink-0" />
								<div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border-2 border-slate-900 p-3.5">
									<span className="text-[13px] break-all font-semibold">{t('swap.newFile')}</span>
									<span className="font-mono text-[11px] text-emerald-600">
										{t('swap.newLive')}
									</span>
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-6 rounded-[22px] bg-slate-900 p-6 text-white sm:p-8">
							<div className="flex flex-col gap-2">
								<span className="font-mono text-xs tracking-[0.14em] text-amber-400 uppercase">
									{t('mode.label')}
								</span>
								<h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
									{t('mode.title')}
								</h2>
								<p className="text-[15px] leading-relaxed text-slate-300">{t('mode.text')}</p>
							</div>
							<div className="flex flex-wrap gap-2.5" aria-hidden="true">
								<span className="flex-1 rounded-xl bg-white p-3 text-center text-sm font-semibold text-slate-900">
									{t('mode.page')}
								</span>
								<span className="flex-1 rounded-xl border border-slate-700 p-3 text-center text-sm font-semibold">
									{t('mode.direct')}
								</span>
							</div>
						</div>
					</section>

					{/* Templates */}
					<section id="vorlagen" className="scroll-mt-24 px-4 pt-24 sm:px-6">
						<SectionHead eyebrow={t('templates.label')} title={t('templates.title')}>
							<p className="text-[17px] leading-relaxed text-slate-600">{t('templates.text')}</p>
						</SectionHead>
						<TemplateGallery locale={locale} templates={[...GALLERY]} className="lg:grid-cols-3" />
					</section>

					{/* Facts */}
					<section className="px-4 pt-24 sm:px-6">
						<dl className="grid grid-cols-1 gap-8 rounded-[28px] bg-white p-8 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.4)] sm:grid-cols-2 sm:p-10 lg:grid-cols-4">
							{facts.map((fact) => (
								<div key={fact.title} className="flex flex-col gap-2">
									<dt className="text-2xl font-extrabold tracking-tight sm:text-3xl">
										{fact.title}
									</dt>
									<dd className="text-[15px] leading-relaxed text-slate-600">{fact.text}</dd>
								</div>
							))}
						</dl>
					</section>

					{/* Industries */}
					<section className="px-4 pt-24 sm:px-6">
						<SectionHead eyebrow={t('industries.label')} title={t('industries.title')} />
						<ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{SOLUTIONS.slice(0, 3).map(([slug, key]) => (
								<li key={slug}>
									<Link
										href={`/products/qr-codes/${slug}`}
										className={`${cardClass} group flex h-full flex-col gap-3 p-7 transition hover:-translate-y-0.5`}
									>
										<h3 className="text-xl font-bold tracking-tight">
											{t(`industries.${key}Title`)}
										</h3>
										<p className="text-[15px] leading-relaxed text-slate-600">
											{t(`industries.${key}Text`)}
										</p>
										<span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold">
											{t('industries.more')}
											<ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
										</span>
									</Link>
								</li>
							))}
						</ul>
						<ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-slate-600">
							{[1, 2, 3].map((n) => (
								<li key={n} className="inline-flex items-center gap-1.5">
									<Check />
									{t(`industries.point${n}`)}
								</li>
							))}
						</ul>
					</section>

					{/* Product pages */}
					<section className="px-4 pt-24 sm:px-6">
						<Link
							href="/products/hosted-pages/digital-manual"
							className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-8 sm:px-8 text-white transition hover:brightness-110"
						>
							<span className="flex max-w-2xl items-start gap-4">
								<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
									<CubeIcon className="size-6 text-amber-400" aria-hidden="true" />
								</span>
								<span className="flex min-w-0 flex-col gap-1.5">
									<span className="font-mono text-xs tracking-[0.14em] text-amber-400 uppercase">
										{t('manual.label')}
									</span>
									<span className="text-2xl font-bold tracking-tight hyphens-auto [overflow-wrap:anywhere]">
										{t('manual.title')}
									</span>
									<span className="text-[15px] text-slate-300">{t('manual.text')}</span>
								</span>
							</span>
							<span className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-900">
								{t('manual.cta')} →
							</span>
						</Link>
					</section>
				</Container>

				<ProductFaqSection title={t('faq.title')} items={faqItems} />

				<Container>
					<section className="px-4 pb-24 sm:px-6">
						<div className="relative flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[32px] bg-[#7a3b12] px-8 py-14 text-[#fdf8f3] sm:px-12 sm:py-16">
							<CtaQrMotif />
							<div className="relative flex max-w-xl flex-col gap-3.5">
								<h2 className="font-serif text-3xl font-semibold sm:text-[44px] sm:leading-[1.06]">
									{t('cta.title')}
								</h2>
								<p className="text-[17px] leading-relaxed text-orange-100">{t('cta.text')}</p>
							</div>
							<Link
								href={CREATE_HREF}
								className="relative rounded-full bg-[#fdf8f3] px-7 py-4 text-[17px] font-bold text-[#2a1608] transition hover:bg-white"
							>
								{t('cta.button')}
							</Link>
						</div>
					</section>
				</Container>
			</article>
			<Footer />
		</>
	);
}
