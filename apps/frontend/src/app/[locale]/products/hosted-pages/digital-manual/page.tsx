import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
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
import { QrGlyph, TypePlate } from '@/components/products/hosted-pages/DigitalManualVisuals';
import { BreadcrumbJsonLd, marketingMetadata } from '@/components/marketing/seo';
import {
	Check,
	Eyebrow,
	SectionHead,
	cardClass,
	titleClass,
} from '@/components/marketing/SectionHead';

const PAGE_PATH = 'products/hosted-pages/digital-manual';
const NAMESPACE = 'productsDigitalManual';
/** Opens the generator on a product page, with the machine template as the preview example */
const CREATE_HREF = '/?type=product&sample=machineManual#generator';
const FAQ_COUNT = 5;
const LAW_ROWS = 6;
const COMPARE_ROWS = 5;

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
	const stats = [1, 2, 3].map((n) => ({
		value: t(`band.s${n}Value`),
		label: t(`band.s${n}Label`),
	}));

	return (
		<>
			<Header />
			<FaqJsonLd items={faqItems} />
			<BreadcrumbJsonLd locale={locale} items={[{ name: t('breadcrumb'), path: PAGE_PATH }]} />
			<article className="text-slate-900">
				{/* Hero */}
				<Container>
					<div className="grid grid-cols-1 items-center gap-14 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
						<div className="flex flex-col gap-6">
							<span className="inline-flex items-center gap-2 self-start rounded-full border border-stone-200 bg-white py-1.5 pr-3.5 pl-1.5 text-[13px] font-semibold shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)]">
								<span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] tracking-wide text-amber-400">
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
									href="#so-gehts"
									className="rounded-xl border border-stone-200 bg-white/70 px-5 py-3.5 font-semibold transition hover:bg-white"
								>
									{t('hero.secondary')}
								</a>
							</div>
							<ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
								{[1, 2, 3].map((n) => (
									<li key={n} className="inline-flex items-center gap-1.5">
										<Check />
										{t(`hero.point${n}`)}
									</li>
								))}
							</ul>
						</div>

						<div className="relative mx-auto h-[560px] w-full max-w-[520px]">
							<TypePlate
								className="absolute top-[250px] left-0 hidden w-[320px] -rotate-[4deg] sm:block"
								model="BS-400/2"
								manufacturer="MUSTER MASCHINENBAU"
							/>
							<svg
								width="120"
								height="80"
								viewBox="0 0 120 80"
								className="absolute top-[170px] left-[150px] hidden sm:block"
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
							<TemplatePhone
								locale={locale}
								template="machineManual"
								scale={0.72}
								className="absolute top-0 right-1/2 h-[560px] w-[270px] translate-x-1/2 sm:right-0 sm:translate-x-0"
							/>
						</div>
					</div>
				</Container>

				{/* Regulation band */}
				<section className="bg-slate-900 text-white">
					<Container>
						<div className="flex flex-wrap items-center justify-between gap-8 px-4 py-11 sm:px-6">
							<div className="flex max-w-md flex-col gap-1.5">
								<span className="font-mono text-xs tracking-[0.14em] text-amber-400">
									{t('band.label')}
								</span>
								<span className="text-2xl font-bold tracking-tight">{t('band.title')}</span>
							</div>
							<dl className="flex flex-wrap gap-x-16 gap-y-6 lg:gap-x-24">
								{stats.map((stat) => (
									<div key={stat.label} className="flex flex-col-reverse gap-1">
										<dt className="text-sm text-slate-400">{stat.label}</dt>
										<dd className="text-4xl font-extrabold tracking-tight">{stat.value}</dd>
									</div>
								))}
							</dl>
						</div>
					</Container>
				</section>

				{/* Steps */}
				<Container>
					<section id="so-gehts" className="scroll-mt-24 px-4 pt-24 sm:px-6 sm:pt-28">
						<SectionHead eyebrow={t('steps.label')} title={t('steps.title')} />
						<ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
							<li className={`${cardClass} flex flex-col gap-4 p-6`}>
								<div className="flex h-[150px] flex-col justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
									{[
										['DE', t('steps.file1'), 'bg-slate-900'],
										['EN', t('steps.file2'), 'bg-slate-900'],
										['CE', t('steps.file3'), 'bg-amber-700'],
									].map(([code, name, color]) => (
										<div
											key={code}
											className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px]"
										>
											<span
												className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white ${color}`}
											>
												{code}
											</span>
											<span className="min-w-0 truncate">{name}</span>
										</div>
									))}
								</div>
								<span className="font-mono text-xs text-slate-400">01</span>
								<h3 className="text-xl font-bold tracking-tight">{t('steps.s1Title')}</h3>
								<p className="text-[15px] leading-relaxed text-slate-600">{t('steps.s1Text')}</p>
							</li>
							<li className={`${cardClass} flex flex-col gap-4 p-6`}>
								<div className="flex h-[150px] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400">
									<div className="rounded-xl bg-white p-2 shadow-[0_0_0_2px_#0f172a,0_16px_30px_-16px_rgba(15,23,42,0.7)]">
										<QrGlyph size={88} />
									</div>
								</div>
								<span className="font-mono text-xs text-slate-400">02</span>
								<h3 className="text-xl font-bold tracking-tight">{t('steps.s2Title')}</h3>
								<p className="text-[15px] leading-relaxed text-slate-600">{t('steps.s2Text')}</p>
							</li>
							<li className={`${cardClass} flex flex-col gap-4 p-6`}>
								<div className="flex h-[150px] items-end justify-center overflow-hidden rounded-2xl bg-orange-50">
									<div className="h-[136px] w-[120px] rounded-t-[20px] bg-slate-900 px-2 pt-2">
										<div className="flex h-full flex-col gap-2 rounded-t-[13px] bg-slate-800 px-2.5 py-3">
											<span className="h-1.5 w-1/2 rounded bg-amber-500" />
											<span className="h-2.5 w-4/5 rounded bg-slate-200" />
											<span className="h-5 rounded-md bg-slate-700" />
											<span className="h-5 rounded-md bg-slate-700" />
										</div>
									</div>
								</div>
								<span className="font-mono text-xs text-slate-400">03</span>
								<h3 className="text-xl font-bold tracking-tight">{t('steps.s3Title')}</h3>
								<p className="text-[15px] leading-relaxed text-slate-600">{t('steps.s3Text')}</p>
							</li>
						</ol>
					</section>

					{/* Features */}
					<section className="px-4 pt-24 sm:px-6">
						<SectionHead eyebrow={t('features.label')} title={t('features.title')} />
						<div className="grid grid-cols-1 gap-5 lg:grid-cols-6">
							<div className={`${cardClass} flex flex-col gap-6 p-7 lg:col-span-4`}>
								<div className="flex flex-col gap-2">
									<h3 className="text-2xl font-bold tracking-tight">
										{t('features.versions.title')}
									</h3>
									<p className="max-w-lg text-[15px] leading-relaxed text-slate-600">
										{t('features.versions.text')}
									</p>
								</div>
								<ol className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0">
									<li className="flex flex-col gap-1.5 sm:pr-3">
										<span className="font-mono text-[11px] text-slate-400">
											{t('features.versions.rev1Dates')}
										</span>
										<span className="text-sm font-semibold text-slate-500">Rev. 1</span>
									</li>
									<li className="flex flex-col gap-1.5 border-slate-200 sm:border-l-2 sm:border-dashed sm:px-3">
										<span className="font-mono text-[11px] text-slate-400">
											{t('features.versions.rev2Dates')}
										</span>
										<span className="text-sm font-semibold text-slate-500">Rev. 2</span>
									</li>
									<li className="flex flex-col gap-1.5 rounded-xl bg-slate-900 px-3.5 py-3 text-white">
										<span className="font-mono text-[11px] text-amber-400">
											{t('features.versions.rev3Dates')}
										</span>
										<span className="text-sm font-semibold">
											{t('features.versions.rev3Label')}
										</span>
									</li>
								</ol>
							</div>
							<div className="flex flex-col gap-4 rounded-[22px] bg-slate-900 p-7 text-white lg:col-span-2">
								<h3 className="text-2xl font-bold tracking-tight">
									{t('features.languages.title')}
								</h3>
								<p className="text-[15px] leading-relaxed text-slate-300">
									{t('features.languages.text')}
								</p>
								<div className="flex flex-wrap gap-1.5 font-mono text-xs">
									{['DE', 'EN', 'FR', 'IT', 'ES', 'PL', 'NL', 'CS', '+18'].map((code, i) => (
										<span
											key={code}
											className={
												i === 0
													? 'rounded-md bg-amber-400 px-2 py-1 font-semibold text-slate-900'
													: 'rounded-md border border-slate-700 px-2 py-1'
											}
										>
											{code}
										</span>
									))}
								</div>
							</div>
							<div className={`${cardClass} flex flex-col gap-4 p-7 lg:col-span-2`}>
								<h3 className="text-xl font-bold tracking-tight">{t('features.paper.title')}</h3>
								<p className="text-[15px] leading-relaxed text-slate-600">
									{t('features.paper.text')}
								</p>
								<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
									<div className="text-slate-400">{t('features.paper.mailTo')}</div>
									<div className="font-semibold">{t('features.paper.mailSubject')}</div>
									<div className="mt-1.5 whitespace-pre-line">{t('features.paper.mailBody')}</div>
								</div>
							</div>
							<div className={`${cardClass} flex flex-col gap-4 p-7 lg:col-span-2`}>
								<h3 className="text-xl font-bold tracking-tight">
									{t('features.declaration.title')}
								</h3>
								<p className="text-[15px] leading-relaxed text-slate-600">
									{t('features.declaration.text')}
								</p>
								<div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
									<span className="text-xl font-extrabold">CE</span>
									<span className="flex flex-col text-[13px]">
										<span className="font-semibold">{t('features.declaration.docTitle')}</span>
										<span className="text-slate-500">PDF · DE · EN</span>
									</span>
								</div>
							</div>
							<div className={`${cardClass} flex flex-col gap-4 p-7 lg:col-span-2`}>
								<h3 className="text-xl font-bold tracking-tight">{t('features.brand.title')}</h3>
								<p className="text-[15px] leading-relaxed text-slate-600">
									{t('features.brand.text')}
								</p>
								<div className="flex gap-2" aria-hidden="true">
									{[
										['#111827', '#f59e0b'],
										['#0f3d3e', '#14b8a6'],
										['#7c2d12', '#ea580c'],
										['#1f2937', '#0ea5e9'],
									].map(([base, accent]) => (
										<span
											key={base}
											className="size-[38px] rounded-[10px]"
											style={{ background: base, boxShadow: `inset 0 -10px 0 ${accent}` }}
										/>
									))}
								</div>
							</div>
						</div>
					</section>

					{/* What the regulation asks */}
					<section className="px-4 pt-24 sm:px-6">
						<div className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.4)]">
							<div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:p-10 sm:pb-7">
								<Eyebrow>{t('law.label')}</Eyebrow>
								<h2 className="text-2xl font-extrabold tracking-tight sm:text-[38px] sm:leading-[1.1]">
									{t('law.title')}
								</h2>
							</div>
							<dl className="text-[15px]">
								{Array.from({ length: LAW_ROWS }, (_, i) => {
									const last = i === LAW_ROWS - 1;
									return (
										<div
											key={i}
											className="grid grid-cols-1 border-b border-slate-100 md:grid-cols-2"
										>
											<dt className="px-6 pt-4 text-slate-600 md:px-10 md:py-4">
												{t(`law.r${i + 1}Rule`)}
											</dt>
											<dd className="flex gap-2.5 px-6 pt-1.5 pb-4 font-medium md:px-10 md:py-4">
												{last ? (
													<ExclamationCircleIcon
														className="size-[18px] shrink-0 text-amber-700"
														aria-hidden="true"
													/>
												) : (
													<Check className="mt-0.5 text-teal-600" />
												)}
												{t(`law.r${i + 1}Answer`)}
											</dd>
										</div>
									);
								})}
							</dl>
							<p className="px-6 pt-4 pb-6 text-xs text-slate-400 sm:px-10">{t('law.note')}</p>
						</div>
					</section>

					{/* Comparison */}
					<section className="px-4 pt-24 sm:px-6">
						<SectionHead eyebrow={t('compare.label')} title={t('compare.title')} />
						<div className={`${cardClass} overflow-x-auto`}>
							<table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
								<thead>
									<tr>
										<th scope="col" className="px-6 py-4">
											<span className="sr-only">{t('compare.feature')}</span>
										</th>
										<th scope="col" className="px-6 py-4 font-semibold text-slate-500">
											{t('compare.colPdf')}
										</th>
										<th scope="col" className="bg-slate-900 px-6 py-4 font-bold text-white">
											{t('compare.colUs')}
										</th>
									</tr>
								</thead>
								<tbody>
									{Array.from({ length: COMPARE_ROWS }, (_, i) => (
										<tr key={i} className="border-t border-slate-100">
											<th scope="row" className="px-6 py-4 font-normal">
												{t(`compare.r${i + 1}`)}
											</th>
											<td className="px-6 py-4 text-slate-400">
												{i === COMPARE_ROWS - 1 ? t('compare.r5Pdf') : '–'}
											</td>
											<td className="border-t border-slate-800 bg-slate-900 px-6 py-4 text-white">
												<Check className="text-amber-400" />
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>

					{/* Templates */}
					<section id="vorlagen" className="scroll-mt-24 px-4 pt-24 sm:px-6">
						<div className="mb-10 flex flex-wrap items-end justify-between gap-5 sm:mb-12">
							<div className="flex max-w-xl flex-col gap-3.5">
								<Eyebrow>{t('templates.label')}</Eyebrow>
								<h2 className={titleClass}>{t('templates.title')}</h2>
							</div>
							<Link href={CREATE_HREF} className="font-semibold hover:underline">
								{t('templates.cta')} →
							</Link>
						</div>
						<TemplateGallery
							locale={locale}
							templates={['machineManual', 'homeAppliance', 'powerTool', 'productManual']}
							className="lg:grid-cols-4"
						/>
					</section>
				</Container>

				<ProductFaqSection title={t('faq.title')} items={faqItems} />

				<Container>
					<section className="px-4 pb-24 sm:px-6">
						<div className="relative flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[32px] bg-slate-900 px-8 py-14 text-white sm:px-12 sm:py-16">
							<CtaQrMotif />
							<div className="relative flex max-w-xl flex-col gap-3.5">
								<h2 className="text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-[1.08]">
									{t('cta.title')}
								</h2>
								<p className="text-[17px] leading-relaxed text-slate-300">{t('cta.text')}</p>
							</div>
							<Link
								href={CREATE_HREF}
								className="relative rounded-2xl bg-amber-400 px-7 py-4 text-[17px] font-bold text-slate-900 transition hover:bg-amber-300"
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
