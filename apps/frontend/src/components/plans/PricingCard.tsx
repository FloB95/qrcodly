'use client';

import { cn } from '@/lib/utils';
import { FEATURE_INFO_LINKS, PLAN_CONFIGS, type PlanId } from '@/lib/plan.config';
import { CheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
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
	const priceSuffix = `/${t('perMonth')}`;

	return (
		<div
			className={cn(
				'rounded-3xl p-8 ring-1 sm:p-10',
				isPro
					? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white sm:ring-slate-800 dark:bg-none dark:bg-card dark:text-foreground dark:ring-2 dark:ring-teal-600'
					: 'bg-card text-foreground ring-border',
			)}
		>
			<div className="flex justify-between">
				<h3 className={cn('text-lg font-semibold', isPro ? 'text-teal-500' : 'text-teal-700')}>
					{t(`${planId}.name`)}
				</h3>
				{priceAnnual && (
					<div className="flex space-x-2 align-middle items-center">
						<span className="text-s text-muted-foreground">{t('annual')}</span>
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
				<span className="text-muted-foreground">{priceSuffix}</span>
			</p>

			<p className="mt-5 text-sm font-medium text-muted-foreground">{t(`${planId}.description`)}</p>

			<ul className="mt-8 space-y-3 text-sm">
				{planConfig.featureKeys.map((featureKey) => {
					const infoHref = FEATURE_INFO_LINKS[featureKey];
					return (
						<li key={featureKey} className="flex items-center gap-x-3">
							<CheckIcon
								className={cn('h-5 w-5 flex-none', isPro ? 'text-teal-500' : 'text-teal-700')}
							/>
							<span>{t(featureKey)}</span>
							{infoHref && (
								<Link
									href={infoHref}
									aria-label={t('featureInfoAriaLabel')}
									className={cn(
										'inline-flex items-center',
										isPro
											? 'text-muted-foreground hover:text-white dark:hover:text-foreground'
											: 'text-muted-foreground hover:text-foreground',
									)}
								>
									<InformationCircleIcon className="h-4 w-4" />
								</Link>
							)}
						</li>
					);
				})}
			</ul>

			{isPro && (
				<div className="mt-8">
					<ProCTA locale={locale} isAuthenticated={isAuthenticated} planPeriod={planPeriod} />
				</div>
			)}
		</div>
	);
};
