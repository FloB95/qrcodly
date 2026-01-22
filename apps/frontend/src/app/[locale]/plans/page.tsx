import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { PricingCard } from '@/components/plans/PricingCard';
import Container from '@/components/ui/container';
import type { PlanId } from '@/lib/plan.config';
import type { DefaultPageParams } from '@/types/page';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations('plans');
	const { isAuthenticated } = await auth();
	const clerk = await clerkClient();
	const plans = await clerk.billing.getPlanList();

	return (
		<>
			<Header />

			<Container className="py-24">
				<div className="text-center">
					<h1 className="mt-12 lg:mt-4 text-center text-2xl sm:text-4xl font-semibold">
						{t('title')}
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">{t('subtitle')}</p>
				</div>

				<div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
					{plans.data.map((plan) => (
						<PricingCard
							key={plan.slug}
							planId={plan.slug as PlanId}
							priceMonthly={plan.fee?.amount > 0 ? plan.fee?.amountFormatted.toString() : '0'}
							priceAnnualPerMonth={plan.annualMonthlyFee?.amountFormatted.toString() || ''}
							locale={locale}
							isAuthenticated={isAuthenticated}
						/>
					))}
				</div>
			</Container>

			<Footer />
		</>
	);
}
