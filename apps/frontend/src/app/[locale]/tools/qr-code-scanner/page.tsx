import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { QrScanner } from '@/components/tools/qr-scanner/QrScanner';
import {
	ScannerContentTypes,
	ScannerHero,
	ScannerSteps,
} from '@/components/tools/qr-scanner/ScannerSections';
import { ProductFeatureSection } from '@/components/products/ProductFeatureSection';
import { DynamicSwapMockup } from '@/components/products/mockups/UseCaseMockups';
import { ProductTipGrid } from '@/components/products/ProductTipGrid';
import { ProductFaqSection } from '@/components/products/ProductFaqSection';
import { ProductCtaSection } from '@/components/products/ProductCtaSection';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { HowToJsonLd } from '@/components/seo/HowToJsonLd';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';
import { env } from '@/env';

const PAGE_PATH = 'tools/qr-code-scanner';
const NAMESPACE = 'qrScannerTool';
const CONTENT_TYPE_KEYS = ['url', 'wifi', 'vcard', 'email', 'phone', 'sms', 'geo', 'text'] as const;
const FAQ_COUNT = 7;

export async function generateStaticParams() {
	return SUPPORTED_LANGUAGES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: NAMESPACE });
	const baseUrl = env.NEXT_PUBLIC_FRONTEND_URL;

	return {
		title: t('metaTitle'),
		description: t('metaDescription'),
		alternates: {
			canonical:
				locale === routing.defaultLocale
					? `${baseUrl}/${PAGE_PATH}`
					: `${baseUrl}/${locale}/${PAGE_PATH}`,
			languages: {
				'x-default': `${baseUrl}/${PAGE_PATH}`,
				...Object.fromEntries(
					routing.locales.map((l) => [
						l,
						l === routing.defaultLocale
							? `${baseUrl}/${PAGE_PATH}`
							: `${baseUrl}/${l}/${PAGE_PATH}`,
					]),
				),
			},
		},
	};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) notFound();

	const t = await getTranslations({ locale, namespace: NAMESPACE });

	const steps = [1, 2, 3].map((n) => ({
		title: t(`steps.step${n}.title`),
		description: t(`steps.step${n}.description`),
	}));

	const contentTypes = CONTENT_TYPE_KEYS.map((key) => ({
		key,
		title: t(`contentTypes.${key}.title`),
		description: t(`contentTypes.${key}.description`),
	}));

	const privacyTips = [1, 2, 3, 4].map((n) => ({
		title: t(`privacy.tip${n}.title`),
		description: t(`privacy.tip${n}.description`),
	}));

	const faqItems = Array.from({ length: FAQ_COUNT }, (_, i) => ({
		question: t(`faq.q${i + 1}`),
		answer: t(`faq.a${i + 1}`),
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

				<ScannerHero
					title={t('hero.title')}
					subtitle={t('hero.subtitle')}
					trustItems={[1, 2, 3].map((n) => t(`trust.item${n}`))}
				>
					<QrScanner />
				</ScannerHero>

				<ScannerSteps title={t('steps.title')} subtitle={t('steps.subtitle')} steps={steps} />

				<ProductTipGrid title={t('privacy.title')} tips={privacyTips} />

				<ScannerContentTypes
					title={t('contentTypes.title')}
					subtitle={t('contentTypes.subtitle')}
					items={contentTypes}
				/>

				<ProductFeatureSection
					title={t('dynamic.title')}
					description={t('dynamic.description')}
					bullets={[1, 2, 3].map((n) => t(`dynamic.point${n}`))}
					actionButton={{ label: t('dynamic.ctaLabel'), href: '/products/qr-codes' }}
					visual={
						<DynamicSwapMockup
							tone="sky"
							label={t('dynamic.visual.label')}
							badge={t('dynamic.visual.badge')}
							ariaLabel={t('dynamic.visual.aria')}
							printedLabel={t('dynamic.visual.printedLabel')}
							oldDestination={t('dynamic.visual.oldDestination')}
							newDestination={t('dynamic.visual.newDestination')}
							footnote={t('dynamic.visual.footnote')}
						/>
					}
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
