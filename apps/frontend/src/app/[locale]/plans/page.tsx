import { CtaSection } from '@/components/CtaSection';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { PricingCard } from '@/components/plans/PricingCard';
import Container from '@/components/ui/container';
import { env } from '@/env';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { DefaultPageParams } from '@/types/page';
import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const PLANS = [
	{
		slug: 'free' as const,
		priceMonthly: '0',
		priceAnnual: undefined,
	},
	{
		slug: 'pro' as const,
		priceMonthly: '4,99',
		priceAnnual: '48,00',
	},
];

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) {
		return {};
	}
	const t = await getTranslations({ locale, namespace: 'plans' });
	const baseUrl = env.NEXT_PUBLIC_FRONTEND_URL;

	return {
		title: t('metaTitle'),
		description: t('metaDescription'),
		alternates: {
			canonical:
				locale === routing.defaultLocale ? `${baseUrl}/plans` : `${baseUrl}/${locale}/plans`,
			languages: {
				'x-default': `${baseUrl}/plans`,
				...Object.fromEntries(
					routing.locales
						.filter((l) => l !== locale)
						.map((l) => [
							l,
							l === routing.defaultLocale ? `${baseUrl}/plans` : `${baseUrl}/${l}/plans`,
						]),
				),
			},
		},
	};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations('plans');
	const { isAuthenticated } = await auth();

	return (
		<>
			<Header />

			<Container className="pt-16 sm:pt-20 pb-10 sm:pb-24">
				<div className="text-center">
					<h1 className="mt-14 text-center text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 max-w-2xl mx-auto">
						{t('title')}
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-700">
						{t('subtitle')}
					</p>
				</div>

				<div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
					{PLANS.map((plan) => (
						<PricingCard
							key={plan.slug}
							planId={plan.slug}
							priceMonthly={plan.priceMonthly}
							priceAnnual={plan.priceAnnual}
							locale={locale}
							isAuthenticated={isAuthenticated}
						/>
					))}
				</div>
			</Container>

			<CtaSection />

			<Footer />
		</>
	);
}
