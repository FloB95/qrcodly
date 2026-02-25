'use client';

import { cn } from '@/lib/utils';
import { PLAN_CONFIGS, type PlanId } from '@/lib/plan.config';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { ProCTA } from './ProCTA';
import { Switch } from '../ui/switch';

export type PricingCardProps = {
	planId: PlanId;
	priceMonthly: string;
	priceAnnual?: string;
	locale: string;
	isAuthenticated: boolean;
};

export const PricingCard = ({
	planId,
	priceMonthly,
	priceAnnual,
	locale,
	isAuthenticated,
}: PricingCardProps) => {
	const t = useTranslations('plans');
	const [planPeriod, setPlanPeriod] = useState<'month' | 'annual'>('annual');
	const planConfig = PLAN_CONFIGS[planId];
	const isPro = planConfig.featured;

	const displayPrice = planPeriod === 'annual' && priceAnnual ? priceAnnual : priceMonthly;
	const priceSuffix = planPeriod === 'annual' && priceAnnual ? t('perYear') : t('perMonth');

	return (
		<div
			className={cn(
				'rounded-3xl p-8 ring-1 sm:p-10',
				isPro
					? 'bg-black text-white sm:shadow-2xl sm:ring-gray-800'
					: 'bg-white text-gray-900 ring-gray-200',
			)}
		>
			<div className="flex justify-between">
				<h3 className={cn('text-lg font-semibold', isPro ? 'text-teal-500' : 'text-teal-700')}>
					{t(`${planId}.name`)}
				</h3>
				{priceAnnual && (
					<div className="flex space-x-2 align-middle items-center">
						<span className="text-s text-gray-200">{t('annual')}</span>
						<Switch
							checked={planPeriod === 'annual'}
							className="data-[state=checked]:bg-teal-600!"
							onCheckedChange={(e) => setPlanPeriod(e ? 'annual' : 'month')}
						/>
					</div>
				)}
			</div>

			<p className="mt-4 flex items-baseline gap-x-2">
				<span className="text-5xl font-semibold">{displayPrice} &euro;</span>
				<span className={isPro ? 'text-gray-400' : 'text-gray-500'}>{priceSuffix}</span>
			</p>

			<p className={`mt-6 text-sm font-medium ${isPro ? 'text-gray-400' : 'text-gray-500'}`}>
				{t(`${planId}.description`)}
			</p>

			<ul className="mt-8 space-y-3 text-sm">
				{planConfig.featureKeys.map((featureKey) => (
					<li key={featureKey} className="flex gap-x-3">
						<CheckIcon
							className={cn('h-5 w-5 flex-none', isPro ? 'text-teal-500' : 'text-teal-700')}
						/>
						{t(featureKey)}
					</li>
				))}
			</ul>

			{isPro && (
				<div className="mt-8">
					<ProCTA locale={locale} isAuthenticated={isAuthenticated} planPeriod={planPeriod} />
				</div>
			)}
		</div>
	);
};
