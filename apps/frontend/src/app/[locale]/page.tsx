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

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale });
	return (
		<QrCodeGeneratorStoreProvider>
			<main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
				<Header />

				<div>
					<Container>
						<h1 className="mt-12 lg:mt-4 mb-16 text-center text-4xl font-bold">
							<div dangerouslySetInnerHTML={{ __html: String(t.raw('headline')) }} />
						</h1>
						<div className="mb-2">
							<QRcodeGenerator generatorType="QrCodeWithDownloadBtn" />
						</div>

						<Features />
						<Cta />
						<FAQSection />
					</Container>
				</div>

				<Footer />
			</main>
		</QrCodeGeneratorStoreProvider>
	);
}
