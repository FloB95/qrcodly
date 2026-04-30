'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, InformationCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn, formatDate } from '@/lib/utils';
import { env } from '@/env';
import { FEATURE_INFO_LINKS, PLAN_CONFIGS } from '@/lib/plan.config';
import { Skeleton } from '@/components/ui/skeleton';
import posthog from 'posthog-js';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useCreateCheckoutSession, useCreatePortalSession } from '@/lib/api/billing';

export function CurrentPlanSection() {
	const t = useTranslations('settings.billing');
	const tPlans = useTranslations('plans');
	const locale = useLocale();
	const { hasProPlan, isCanceled, isLoading, subscription } = useHasProPlan();
	const searchParams = useSearchParams();
	const createCheckoutSession = useCreateCheckoutSession();
	const createPortalSession = useCreatePortalSession();
	const [selectedPeriod, setSelectedPeriod] = useState<'annual' | 'month'>('annual');
	const conversionTracked = useRef(false);

	// Google Ads: Subscription conversion tracking
	useEffect(() => {
		if (conversionTracked.current) return;
		if (searchParams.get('checkout') !== 'success') return;
		if (!subscription?.stripePriceId) return;
		if (typeof window.gtag !== 'function') return;

		const isAnnual = subscription.stripePriceId === env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL;
		const value = isAnnual ? 83.88 : 8.99;

		window.gtag('event', 'conversion', {
			send_to: 'AW-10838865201/Stq3CL_pnY0cELHqr7Ao',
			value,
			currency: 'EUR',
		});
		conversionTracked.current = true;
	}, [searchParams, subscription?.stripePriceId]);

	if (isLoading) {
		return (
			<div className="grid gap-6 lg:grid-cols-2">
				<PlanCardSkeleton />
				<PlanCardSkeleton />
			</div>
		);
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

	const legacyPriceIds = [
		env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY_LEGACY,
		env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL_LEGACY,
	].filter(Boolean);
	const isLegacySubscription = legacyPriceIds.includes(subscription?.stripePriceId ?? '');
	const annualPriceIds = [
		env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL,
		env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL_LEGACY,
	].filter(Boolean);
	const isAnnualSubscription = annualPriceIds.includes(subscription?.stripePriceId ?? '');

	const proPrice = selectedPeriod === 'annual' ? '6,99' : '8,99';
	const billingNote = selectedPeriod === 'annual' ? t('billedAnnually') : t('billedMonthly');
	const currentProPrice = isLegacySubscription
		? isAnnualSubscription
			? '4,00'
			: '4,99'
		: isAnnualSubscription
			? '6,99'
			: '8,99';
	const currentBillingNote = isAnnualSubscription ? t('billedAnnually') : t('billedMonthly');

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Free Plan Card */}
			<Card className={cn(hasProPlan && 'order-last')}>
				<CardContent className="p-6 sm:p-8 space-y-5">
					<div>
						<h3 className="text-lg font-semibold flex items-center gap-2 text-teal-700 dark:text-teal-500">
							{tPlans('free.name')}
							{!hasProPlan && <Badge variant="blue">{t('currentPlan')}</Badge>}
						</h3>
					</div>

					<p className="flex items-baseline gap-x-2">
						<span className="text-3xl lg:text-4xl font-semibold">0 &euro;</span>
						<span className="text-muted-foreground">/{tPlans('perMonth')}</span>
					</p>

					<p className="text-sm text-muted-foreground">{tPlans('free.description')}</p>

					<ul className="space-y-3 text-sm">
						{PLAN_CONFIGS.free.featureKeys.map((featureKey) => {
							const infoHref = FEATURE_INFO_LINKS[featureKey];
							return (
								<li key={featureKey} className="flex items-center gap-x-3">
									<CheckIcon className="h-5 w-5 flex-none text-teal-700 dark:text-teal-500" />
									<span>{tPlans(featureKey)}</span>
									{infoHref && (
										<Link
											href={infoHref}
											aria-label={tPlans('featureInfoAriaLabel')}
											className="text-muted-foreground hover:text-foreground"
										>
											<InformationCircleIcon className="h-4 w-4" />
										</Link>
									)}
								</li>
							);
						})}
					</ul>
				</CardContent>
			</Card>

			{/* Pro Plan Card */}
			<Card
				className={cn(
					'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-slate-800',
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
									<span className="text-sm text-gray-200">{tPlans('annual')}</span>
									<Switch
										checked={selectedPeriod === 'annual'}
										className="data-[state=checked]:bg-teal-600!"
										onCheckedChange={(checked) => setSelectedPeriod(checked ? 'annual' : 'month')}
									/>
								</div>
							)
						)}
					</div>

					<div>
						<p className="flex items-baseline gap-x-2">
							<span className="text-3xl lg:text-4xl font-semibold">
								{hasProPlan ? currentProPrice : proPrice} &euro;
							</span>
							<span className="text-slate-300">/{tPlans('perMonth')}</span>
						</p>
						<p className="text-sm text-slate-300 mt-1">
							{hasProPlan ? currentBillingNote : billingNote}
						</p>
					</div>

					{!hasProPlan && (
						<p className="text-sm font-medium text-slate-300">{tPlans('pro.description')}</p>
					)}

					<ul className="space-y-3 text-sm">
						{PLAN_CONFIGS.pro.featureKeys.map((featureKey) => {
							const infoHref = FEATURE_INFO_LINKS[featureKey];
							return (
								<li key={featureKey} className="flex items-center gap-x-3">
									<CheckIcon className="h-5 w-5 flex-none text-teal-500" />
									<span>{tPlans(featureKey)}</span>
									{infoHref && (
										<Link
											href={infoHref}
											aria-label={tPlans('featureInfoAriaLabel')}
											className="text-slate-400 hover:text-white"
										>
											<InformationCircleIcon className="h-4 w-4" />
										</Link>
									)}
								</li>
							);
						})}
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

function PlanCardSkeleton() {
	return (
		<Card>
			<CardContent className="p-6 sm:p-8 space-y-5">
				<Skeleton className="h-6 w-20" />
				<Skeleton className="h-10 w-32" />
				<Skeleton className="h-4 w-full" />
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-4 w-3/4" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}
