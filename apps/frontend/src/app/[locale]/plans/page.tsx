import { CtaSection } from '@/components/CtaSection';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { PricingCard } from '@/components/plans/PricingCard';
import Container from '@/components/ui/container';
import { env } from '@/env';
import { routing, SUPPORTED_LANGUAGES } from '@/i18n/routing';
import type { PlanId } from '@/lib/plan.config';
import type { DefaultPageParams } from '@/types/page';
import { auth, clerkClient } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { unstable_cache } from 'next/cache';

const getCachedPlanList = unstable_cache(
	async () => {
		const clerk = await clerkClient();
		const plans = await clerk.billing.getPlanList();
		return plans.data.map((plan) => ({
			slug: plan.slug,
			feeAmount: plan.fee?.amount ?? 0,
			feeAmountFormatted: plan.fee?.amountFormatted?.toString() ?? '0',
			annualMonthlyFeeFormatted: plan.annualMonthlyFee?.amountFormatted?.toString() ?? '',
		}));
	},
	['clerk-billing-plans'],
	{ revalidate: 3600 },
);

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
			canonical: `${baseUrl}/${locale}/plans`,
			languages: {
				'x-default': `${baseUrl}/plans`,
				...Object.fromEntries(
					routing.locales.filter((l) => l !== locale).map((l) => [l, `${baseUrl}/${l}/plans`]),
				),
			},
		},
	};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations('plans');
	const { isAuthenticated } = await auth();
	const plans = await getCachedPlanList();

	return (
		<>
			<Header />

			<Container className="pt-16 sm:pt-20 pb-10 sm:pb-24">
				<div className="text-center">
					<h1 className="mt-14 text-center text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 max-w-2xl mx-auto">
						{t('title')}
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">{t('subtitle')}</p>
				</div>

				<div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
					{plans.map((plan) => (
						<PricingCard
							key={plan.slug}
							planId={plan.slug as PlanId}
							priceMonthly={plan.feeAmount > 0 ? plan.feeAmountFormatted : '0'}
							priceAnnualPerMonth={plan.annualMonthlyFeeFormatted}
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
