'use client';

import type { Tier } from '@/app/[locale]/plans/page';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';
import { ProCTA } from './ProCTA';
import { Switch } from '../ui/switch';

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
	const [planPeriod, setPlanPeriod] = useState<'month' | 'annual'>('annual');

	return (
		<div
			className={cn(
				'rounded-3xl p-8 ring-1 sm:p-10',
				isPro
					? 'bg-black text-white shadow-2xl ring-gray-800'
					: 'bg-white text-gray-900 ring-gray-200',
			)}
		>
			<div className="flex justify-between">
				<h3 className={cn('text-lg font-semibold', isPro ? 'text-indigo-400' : 'text-indigo-600')}>
					{tier.name}
				</h3>
				{tier.priceAnnualPerMonth && (
					<div className="flex space-x-2 align-middle items-center">
						<span className="text-s text-gray-200">Jährlich</span>
						<Switch
							checked={planPeriod === 'annual'}
							className="data-[state=checked]:bg-indigo-400!"
							onCheckedChange={(e) => setPlanPeriod(e ? 'annual' : 'month')}
						/>
					</div>
				)}
			</div>

			<p className="mt-4 flex items-baseline gap-x-2">
				<span className="text-5xl font-semibold">
					{planPeriod === 'annual' && tier.priceAnnualPerMonth
						? tier.priceAnnualPerMonth
						: tier.priceMonthly}
				</span>
				<span className={isPro ? 'text-gray-400' : 'text-gray-500'}>/month</span>
			</p>

			{tier.description && (
				<p className={`mt-6 text-sm font-medium ${isPro ? 'text-gray-400' : 'text-gray-500'}`}>
					{tier.description}
				</p>
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
					<ProCTA
						locale={locale}
						isAuthenticated={isAuthenticated}
						hasProPlan={hasProPlan}
						planPeriod={planPeriod}
					/>
				</div>
			)}
		</div>
	);
};
