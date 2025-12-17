import type { Tier } from '@/app/[locale]/plans/page';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { ProCTA } from './ProCTA';

export const PricingCard = ({
	tier,
	isPro,
	locale,
	isAuthenticated,
	hasProPlan,
}: {
	tier: Tier;
	isPro: boolean;
	locale: string;
	isAuthenticated: boolean;
	hasProPlan: boolean;
}) => {
	return (
		<div
			className={cn(
				'rounded-3xl p-8 ring-1 sm:p-10',
				isPro
					? 'bg-black text-white shadow-2xl ring-gray-800'
					: 'bg-white text-gray-900 ring-gray-200',
			)}
		>
			<h3 className={cn('text-lg font-semibold', isPro ? 'text-indigo-400' : 'text-indigo-600')}>
				{tier.name}
			</h3>

			<p className="mt-4 flex items-baseline gap-x-2">
				<span className="text-5xl font-semibold">{tier.priceMonthly}</span>
				<span className={isPro ? 'text-gray-400' : 'text-gray-500'}>/month</span>
			</p>

			{tier.description && (
				<p className="mt-6 text-sm text-muted-foreground font-medium">{tier.description}</p>
			)}

			<ul className="mt-8 space-y-3 text-sm">
				{tier.features.map((feature) => (
					<li key={feature} className="flex gap-x-3">
						<CheckIcon
							className={cn('h-5 w-5 flex-none', isPro ? 'text-indigo-400' : 'text-indigo-600')}
						/>
						{feature}
					</li>
				))}
			</ul>

			{isPro && (
				<div className="mt-8">
					<ProCTA locale={locale} isAuthenticated={isAuthenticated} hasProPlan={hasProPlan} />
				</div>
			)}
		</div>
	);
};
