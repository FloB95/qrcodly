import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { FaqPageContent, type FaqCategory } from '@/components/faq/FaqPageContent';
import { buttonVariants } from '@/components/ui/button';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { Metadata } from 'next';
import { env } from '@/env';

const PAGE_PATH = 'faq';

const CATEGORY_KEYS = ['general', 'qrCodes', 'urlShortener', 'analytics', 'pricing'] as const;

const CATEGORY_COUNTS: Record<(typeof CATEGORY_KEYS)[number], number> = {
	general: 7,
	qrCodes: 9,
	urlShortener: 8,
	analytics: 6,
	pricing: 5,
};

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};
	const t = await getTranslations({ locale, namespace: 'faqPage' });
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
					routing.locales
						.filter((l) => l !== locale)
						.map((l) => [
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

	const t = await getTranslations({ locale, namespace: 'faqPage' });

	const categoryLabelMap: Record<(typeof CATEGORY_KEYS)[number], string> = {
		general: t('generalCategory'),
		qrCodes: t('qrCodesCategory'),
		urlShortener: t('urlShortenerCategory'),
		analytics: t('analyticsCategory'),
		pricing: t('pricingCategory'),
	};

	const categories: FaqCategory[] = CATEGORY_KEYS.map((key) => ({
		key,
		label: categoryLabelMap[key],
		items: Array.from({ length: CATEGORY_COUNTS[key] }, (_, i) => ({
			id: `faq-${key}-${i + 1}`,
			question: t(`categories.${key}.q${i + 1}`),
			answer: t(`categories.${key}.a${i + 1}`),
		})),
	}));

	// Build JSON-LD FAQPage structured data with ALL FAQs
	// Content is from our own translation files (trusted), not user input
	const allFaqItems = categories.flatMap((cat) => cat.items);
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: allFaqItems.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer,
			},
		})),
	};

	return (
		<>
			<Header />
			<article>
				<script
					type="application/ld+json"
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>

				{/* Hero */}
				<section className="pt-24 pb-12 sm:pt-32 sm:pb-16 text-center">
					<Container>
						<Heading as="h1" size="hero" className="mb-4">
							{t('heroTitle')}
						</Heading>
						<p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('heroSubtitle')}</p>
					</Container>
				</section>

				{/* FAQ Content */}
				<section className="pb-16 sm:pb-24">
					<Container>
						<FaqPageContent
							categories={categories}
							allLabel={t('allCategory')}
							searchPlaceholder={t('searchPlaceholder')}
							noResults={t('noResults')}
						/>
					</Container>
				</section>

				{/* CTA */}
				<section className="pb-16 sm:pb-24">
					<Container>
						<div className="max-w-4xl mx-auto p-px rounded-2xl bg-gradient-to-r from-[#f4f4f5] to-[#fddfbc]">
							<div className="flex flex-col items-center justify-center text-center py-12 px-5 xs:px-10 md:py-16 rounded-[15px] bg-gradient-to-r from-white to-[#fff3e6]">
								<Heading as="h2" size="lg">
									{t('ctaTitle')}
								</Heading>
								<p className="text-slate-700 mt-3 md:text-lg max-w-xl">{t('ctaDescription')}</p>
								<div className="mt-8">
									<a href="mailto:info@qrcodly.de" className={buttonVariants({ size: 'lg' })}>
										<EnvelopeIcon className="mr-2 h-5 w-5" />
										{t('ctaButton')}
									</a>
								</div>
							</div>
						</div>
					</Container>
				</section>
			</article>
			<Footer />
		</>
	);
}
