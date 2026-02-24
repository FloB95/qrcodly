'use client';

import { useState } from 'react';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn, formatDate } from '@/lib/utils';
import { env } from '@/env';
import { PLAN_CONFIGS } from '@/lib/plan.config';
import { BillingSkeleton } from './BillingSkeleton';
import posthog from 'posthog-js';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useCreateCheckoutSession, useCreatePortalSession } from '@/lib/api/billing';

export function CurrentPlanSection() {
	const t = useTranslations('settings.billing');
	const tPlans = useTranslations('plans');
	const locale = useLocale();
	const { hasProPlan, isCanceled, isLoading, subscription } = useHasProPlan();
	const createCheckoutSession = useCreateCheckoutSession();
	const createPortalSession = useCreatePortalSession();
	const [selectedPeriod, setSelectedPeriod] = useState<'annual' | 'month'>('annual');

	if (isLoading) {
		return <BillingSkeleton titleWidth="w-32" />;
	}

	const priceId =
		selectedPeriod === 'annual'
			? env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL
			: env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY;

	const handleUpgrade = () => {
		posthog.capture('subscription:checkout_started');
		createCheckoutSession.mutate({ priceId, locale });
	};

	const handleManageSubscription = () => {
		createPortalSession.mutate({ locale });
	};

	const isAnnualSubscription =
		subscription?.stripePriceId === env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL;

	const proPrice = selectedPeriod === 'annual' ? '48,00' : '4,99';
	const priceSuffix = selectedPeriod === 'annual' ? tPlans('perYear') : tPlans('perMonth');

	const currentProPrice = isAnnualSubscription ? '48,00' : '4,99';
	const currentProPriceSuffix = isAnnualSubscription ? tPlans('perYear') : tPlans('perMonth');

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Free Plan Card */}
			<Card className={cn(hasProPlan && 'order-last')}>
				<CardContent className="p-6 sm:p-8 space-y-5">
					<div>
						<h3 className="text-lg font-semibold flex items-center gap-2 text-teal-700 dark:text-teal-500">
							{tPlans('free.name')}
							{!hasProPlan && (
								<Badge className="bg-black text-white dark:bg-white dark:text-black">
									{t('currentPlan')}
								</Badge>
							)}
						</h3>
					</div>

					<p className="flex items-baseline gap-x-2">
						<span className="text-3xl lg:text-4xl font-semibold">0 &euro;</span>
						<span className="text-muted-foreground">{tPlans('perMonth')}</span>
					</p>

					<p className="text-sm text-muted-foreground">{tPlans('free.description')}</p>

					<ul className="space-y-3 text-sm">
						{PLAN_CONFIGS.free.featureKeys.map((featureKey) => (
							<li key={featureKey} className="flex gap-x-3">
								<CheckIcon className="h-5 w-5 flex-none text-teal-700 dark:text-teal-500" />
								{tPlans(featureKey)}
							</li>
						))}
					</ul>
				</CardContent>
			</Card>

			{/* Pro Plan Card */}
			<Card
				className={cn(
					'bg-black text-white shadow-2xl border-gray-800',
					hasProPlan && 'order-first',
				)}
			>
				<CardContent className="p-6 sm:p-8 space-y-5">
					<div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1">
						<h3 className="text-lg font-semibold text-teal-500 flex items-center gap-2">
							{tPlans('pro.name')}
							{hasProPlan && (
								<Badge className="text-teal-400 border-teal-500/50 bg-teal-500/10">
									{t('currentPlan')}
								</Badge>
							)}
						</h3>
						{hasProPlan && subscription?.currentPeriodEnd ? (
							<span
								className={cn(
									'text-sm font-semibold',
									isCanceled ? 'text-red-500 brightness-125' : 'text-white',
								)}
							>
								{isCanceled
									? t('expiresOn', {
											date: formatDate(subscription.currentPeriodEnd, {
												hideTime: true,
											}),
										})
									: t('renewsOn', {
											date: formatDate(subscription.currentPeriodEnd, {
												hideTime: true,
											}),
										})}
							</span>
						) : (
							!hasProPlan && (
								<div className="flex space-x-2 items-center">
									<span className="text-s text-gray-200">{tPlans('annual')}</span>
									<Switch
										checked={selectedPeriod === 'annual'}
										className="data-[state=checked]:bg-teal-600!"
										onCheckedChange={(checked) => setSelectedPeriod(checked ? 'annual' : 'month')}
									/>
								</div>
							)
						)}
					</div>

					<p className="flex items-baseline gap-x-2">
						<span className="text-3xl lg:text-4xl font-semibold">
							{hasProPlan ? currentProPrice : proPrice} &euro;
						</span>
						<span className="text-gray-400">
							{hasProPlan ? currentProPriceSuffix : priceSuffix}
						</span>
					</p>

					{!hasProPlan && (
						<p className="text-sm font-medium text-gray-400">{tPlans('pro.description')}</p>
					)}

					<ul className="space-y-3 text-sm">
						{PLAN_CONFIGS.pro.featureKeys.map((featureKey) => (
							<li key={featureKey} className="flex gap-x-3">
								<CheckIcon className="h-5 w-5 flex-none text-teal-500" />
								{tPlans(featureKey)}
							</li>
						))}
					</ul>

					<div className="pt-4">
						{hasProPlan ? (
							<Button
								variant="secondary"
								onClick={handleManageSubscription}
								disabled={createPortalSession.isPending}
							>
								{isCanceled && <SparklesIcon className="size-4 mr-2" />}
								{isCanceled ? t('renewSubscription') : t('manageSubscription')}
							</Button>
						) : (
							<Button
								variant="secondary"
								onClick={handleUpgrade}
								disabled={createCheckoutSession.isPending}
							>
								<SparklesIcon className="size-4 mr-2" />
								{t('upgradeToPro')}
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
