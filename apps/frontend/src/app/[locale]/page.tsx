import Footer from '@/components/Footer';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import Header from '@/components/Header';
import Container from '@/components/ui/container';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import Script from 'next/script';
import { QrCodeDefaults } from '@shared/schemas';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { Hero } from '@/components/Hero';
import dynamic from 'next/dynamic';

// Dynamic imports for below-the-fold components to reduce initial bundle size
const FeatureSlider = dynamic(
	() => import('@/components/FeatureSlider').then((mod) => mod.FeatureSlider),
	{ ssr: true },
);
const ProductShowcase = dynamic(
	() => import('@/components/ProductShowcase').then((mod) => mod.ProductShowcase),
	{ ssr: true },
);
const Cta = dynamic(() => import('@/components/Cta').then((mod) => mod.Cta), {
	ssr: true,
});
const FAQSection = dynamic(() => import('@/components/Faq'), {
	ssr: true,
});

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) {
		notFound();
	}

	const tMeta = await getTranslations({ locale, namespace: 'metadata' });
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
							isEditable: isSignedIn,
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
							<QRcodeGenerator generatorType="QrCodeWithDownloadBtn" />
						</section>
					</Container>
				</article>
			</QrCodeGeneratorStoreProvider>

			{/* Features Slider */}
			<section id="features" aria-label="Features" className="py-10 sm:py-24">
				<FeatureSlider />
			</section>

			{/* Product Showcase */}
			<section id="showcase" aria-label="Product Showcase" className="py-10 sm:py-24">
				<ProductShowcase />
			</section>

			{/* FAQ Section */}
			<section id="faq" aria-label="FAQ" className="py-10 sm:py-24">
				<FAQSection />
			</section>

			{/* Contact CTA */}
			<section id="cta" aria-label="Contact Us" className="py-10 sm:py-24">
				<Cta />
			</section>

			<Footer />
		</>
	);
}
