import { Suspense } from 'react';
import Footer from '@/components/Footer';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import Header from '@/components/Header';
import Container from '@/components/ui/container';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { GeneratorPrefill } from '@/components/qr-generator/GeneratorPrefill';
import Script from 'next/script';
import { QrCodeDefaults } from '@shared/schemas';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { Hero } from '@/components/Hero';
import { ProductStatsBar } from '@/components/products/ProductStatsBar';
import { ProductBento } from '@/components/products/ProductBento';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { TemplatePhone } from '@/components/products/hosted-pages/TemplatePhone';
import { QrCustomizationMockup } from '@/components/products/mockups/QrCodesMockups';
import { DashboardShowcase } from '@/components/marketing/DashboardScene';
import { SectionHead } from '@/components/marketing/SectionHead';
import { HomeIntegrations, HomeSolutions } from '@/components/home/HomeSections';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { ChartBarIcon, LinkIcon } from '@heroicons/react/24/outline';
export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) {
		notFound();
	}

	const tMeta = await getTranslations({ locale, namespace: 'metadata' });
	const tStats = await getTranslations({ locale, namespace: 'homeStats' });
	const tHome = await getTranslations({ locale, namespace: 'home' });
	const m = await getTranslations({ locale, namespace: 'marketing' });
	const qr = await getTranslations({ locale, namespace: 'productsQrCodes' });
	const url = await getTranslations({ locale, namespace: 'productsUrlShortener' });
	const ana = await getTranslations({ locale, namespace: 'productsAnalytics' });
	const tFaq = await getTranslations({ locale, namespace: 'faq' });
	const faqItems = Array.from({ length: 11 }, (_, i) => ({
		question: tFaq(`question${i + 1}`),
		answer: tFaq(`answer${i + 1}`),
	}));
	const { userId } = await auth();
	const isSignedIn = !!userId;

	// WebApplication Structured Data (homepage-specific)
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'QRcodly',
		url: 'https://www.qrcodly.de',
		description: tMeta('structuredData.description'),
		applicationCategory: 'UtilitiesApplication',
		operatingSystem: 'Any',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'EUR',
		},
		creator: {
			'@type': 'Organization',
			name: 'QRcodly',
			url: 'https://www.qrcodly.de',
		},
		featureList: tMeta.raw('structuredData.features'),
		screenshot: 'https://www.qrcodly.de/og-image.webp',
	};

	return (
		<>
			{/* WebApplication Structured Data */}
			<Script
				id="structured-data-app"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
			/>

			<Header />

			<QrCodeGeneratorStoreProvider
				initState={{
					config: QrCodeDefaults,
					content: {
						type: 'url',
						data: {
							url: '',
							isDynamic: isSignedIn,
						},
					},
					latestQrCode: undefined,
					lastError: undefined,
					bulkMode: {
						file: undefined,
						isBulkMode: false,
					},
				}}
			>
				<article className="pb-10 sm:pb-24">
					<Container>
						<Hero />

						{/* Main QR Code Generator Tool */}
						<section id="generator" aria-label="QR Code Generator Tool">
							<Suspense fallback={null}>
								<GeneratorPrefill />
							</Suspense>
							<QRcodeGenerator generatorType="QrCodeWithDownloadBtn" />
						</section>
					</Container>
				</article>
			</QrCodeGeneratorStoreProvider>

			<FaqJsonLd items={faqItems} />

			<ProductStatsBar
				eyebrow={m('eyebrow.numbers')}
				title={tHome('statsTitle')}
				stats={[1, 2, 3].map((n) => ({
					value: tStats(`stat${n}Value`),
					label: tStats(`stat${n}Label`),
				}))}
			/>

			<ProductBento
				eyebrow={m('eyebrow.features')}
				title={tHome('products.title')}
				subtitle={tHome('products.subtitle')}
				tiles={[
					{
						title: qr('badge'),
						description: url('crossProducts.qrCodes.description'),
						span: 4,
						visual: <QrCustomizationMockup />,
						action: { label: m('pdfBanner.cta'), href: '/products/qr-codes' },
					},
					{
						title: url('badge'),
						description: qr('crossProducts.urlShortener.description'),
						span: 2,
						dark: true,
						icon: <LinkIcon className="size-5" />,
						action: { label: m('pdfBanner.cta'), href: '/products/url-shortener' },
					},
					{
						title: ana('badge'),
						description: qr('crossProducts.analytics.description'),
						span: 2,
						icon: <ChartBarIcon className="size-5" />,
						action: { label: m('pdfBanner.cta'), href: '/products/analytics' },
					},
					{
						title: qr('features.hostedPages.title'),
						description: qr('features.hostedPages.description'),
						span: 4,
						visual: (
							<div className="flex h-[380px] justify-center gap-4" aria-hidden="true">
								<TemplatePhone
									locale={locale}
									template="restaurantMenu"
									scale={0.5}
									className="h-[380px] w-[190px]"
								/>
								<TemplatePhone
									locale={locale}
									template="machineManual"
									scale={0.5}
									className="hidden h-[380px] w-[190px] translate-y-6 sm:block"
								/>
							</div>
						),
						action: {
							label: qr('features.hostedPages.actionLabel'),
							href: '/products/hosted-pages/pdf',
						},
					},
				]}
			/>

			<section className="py-12 sm:py-20">
				<Container>
					<div className="sm:px-6 lg:px-8">
						<SectionHead
							eyebrow={tHome('dashboard.eyebrow')}
							title={tHome('dashboard.title')}
							subtitle={tHome('dashboard.subtitle')}
						/>
						<DashboardShowcase className="mx-auto max-w-6xl" />
					</div>
				</Container>
			</section>

			<HomeSolutions locale={locale} />

			<HomeIntegrations locale={locale} />

			<ProductFaqSection
				eyebrow={m('eyebrow.faq')}
				title={tFaq('headline')}
				items={faqItems}
				viewAllLabel={tFaq('viewAll')}
			/>

			<ProductCtaSection
				title={tHome('cta.title')}
				subtitle={tHome('cta.subtitle')}
				ctaLabel={tHome('cta.button')}
				ctaHref="/#generator"
			/>

			<Footer />
		</>
	);
}
