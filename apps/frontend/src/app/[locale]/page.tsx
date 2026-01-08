import Footer from '@/components/Footer';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import Header from '@/components/Header';
import Container from '@/components/ui/container';
import { Cta } from '@/components/Cta';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { Features } from '@/components/Features';
import FAQSection from '@/components/Faq';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import Script from 'next/script';
import { QrCodeDefaults } from '@shared/schemas';
import { auth } from '@clerk/nextjs/server';

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale });
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
			{/* WebApplication Structured Data */}
			<Script
				id="structured-data-app"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
			/>

			<Header />

			<article>
				<Container>
					<h1 className="mt-12 mb-14 text-center text-3xl xs:text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
						<div dangerouslySetInnerHTML={{ __html: String(t.raw('headline')) }} />
					</h1>

					{/* Main QR Code Generator Tool */}
					<section aria-label="QR Code Generator Tool" className="mb-2">
						<QRcodeGenerator generatorType="QrCodeWithDownloadBtn" />
					</section>

					{/* Features Section */}
					<section aria-label="Features" className="mt-16">
						<Features />
					</section>

					{/* Call to Action */}
					<section aria-label="Get Started" className="mt-16">
						<Cta />
					</section>

					{/* FAQ Section */}
					<section aria-label="Frequently Asked Questions" className="mt-16">
						<FAQSection />
					</section>
				</Container>
			</article>

			<Footer />
		</QrCodeGeneratorStoreProvider>
	);
}
