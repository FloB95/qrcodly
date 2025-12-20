import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { PricingCard } from '@/components/plans/PricingCard';
import Container from '@/components/ui/container';
import type { DefaultPageParams } from '@/types/page';
import { auth } from '@clerk/nextjs/server';

export type Tier = {
	name: string;
	id: string;
	priceMonthly: string;
	priceAnnualPerMonth?: string;
	description?: string;
	features: string[];
	featured: boolean;
};
const tiers: Tier[] = [
	{
		name: 'Free',
		id: 'tier-free',
		priceMonthly: '$0',
		description:
			'Completely free. Access all essential QR code features without limits or paywalls.',
		features: [
			'Unlimited QR codes & scans',
			'Static & dynamic QR codes',
			'Custom styling & icons',
			'Detailed analytics',
			'No credit card required',
			'Limited API access',
			'Limited bulk QR code generation',
		],
		featured: false,
	},
	{
		name: 'Pro',
		id: 'tier-pro',
		priceMonthly: '$3.50',
		priceAnnualPerMonth: '$2.99',
		description: 'Support us & unlock all features for your QR codes.',
		features: [
			'Everything in Free',
			'Unlimited bulk QR code generation',
			'Unlimited API access',
			'Priority support',
			'Team features (coming soon)',
		],
		featured: true,
	},
];

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const { isAuthenticated, has } = await auth();
	const hasProPlan = has({ plan: 'pro_user' });

	return (
		<main className="flex min-h-screen flex-col justify-between bg-linear-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
			<Header />

			<Container className="py-24">
				<div className="text-center">
					<h1 className="mt-12 lg:mt-4 text-center text-2xl sm:text-4xl font-bold">
						Choose the right plan for you
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
						QRcodly is free by default. Most features will always stay free. You only pay for
						cost-intensive infrastructure.
					</p>
				</div>

				<div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
					{tiers.map((tier) => (
						<PricingCard
							key={tier.id}
							tier={tier}
							isPro={tier.featured}
							locale={locale}
							isAuthenticated={isAuthenticated}
							hasProPlan={hasProPlan}
						/>
					))}
				</div>
			</Container>

			<Footer />
		</main>
	);
}
