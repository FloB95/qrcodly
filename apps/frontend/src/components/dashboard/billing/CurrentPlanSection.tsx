'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { CheckoutButton, useSubscription } from '@clerk/nextjs/experimental';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { env } from '@/env';
import { PLAN_CONFIGS } from '@/lib/plan.config';
import { CancelPlanDialog } from './CancelPlanDialog';
import { BillingSkeleton } from './BillingSkeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import posthog from 'posthog-js';

export function CurrentPlanSection() {
	const pathname = usePathname();
	const t = useTranslations('settings.billing');
	const tPlans = useTranslations('plans');
	const { isLoading, isFetching, data, revalidate } = useSubscription();
	const [selectedPeriod, setSelectedPeriod] = useState<'annual' | 'month'>('annual');

	if (isLoading || isFetching) {
		return <BillingSkeleton titleWidth="w-32" />;
	}

	const subscriptionItem = data?.subscriptionItems.filter((s) => s.status === 'active')[0];

	if (!subscriptionItem) {
		return null;
	}

	const currentPlan = subscriptionItem?.plan;
	const planPeriod = (subscriptionItem?.planPeriod as 'annual' | 'month') || 'annual';
	const hasProPlan = currentPlan?.slug === 'pro';
	const planConfig = hasProPlan ? PLAN_CONFIGS.pro : PLAN_CONFIGS.free;

	const fee = currentPlan?.[planPeriod === 'annual' ? 'annualFee' : 'annualMonthlyFee'];
	const formattedPrice = fee ? formatCurrency(fee.amount, fee.currency) : '';

	if (!currentPlan) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{t('currentPlan')}
							<Badge className="text-teal-500 text-md" variant="outline">
								{hasProPlan ? 'Pro' : 'Free'}
							</Badge>
						</CardTitle>
						<CardDescription className="mt-1">
							{hasProPlan
								? t('proDescription')
								: t.rich('freeDescription', {
										link: (chunks) => (
											<Link href="/plans" className="underline hover:text-foreground">
												{chunks}
											</Link>
										),
									})}
						</CardDescription>
					</div>
					{hasProPlan && (
						<div className="flex items-center gap-2 text-primary">
							<SparklesIcon className="size-5" />
						</div>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<h4 className="text-sm font-medium mb-3">{t('includedFeatures')}</h4>
						<ul className="space-y-2">
							{planConfig.featureKeys.map((featureKey) => (
								<li
									key={featureKey}
									className="flex items-center gap-2 text-sm text-muted-foreground"
								>
									<CheckIcon className="size-4 stroke-2 text-teal-500" />
									{tPlans(featureKey)}
								</li>
							))}
						</ul>
					</div>

					{currentPlan && hasProPlan && (
						<div className="border rounded-lg p-4 bg-muted/50">
							<h4 className="text-sm font-medium mb-2">{t('billingCycle')}</h4>
							<p className="text-2xl font-bold">
								{formattedPrice}{' '}
								<span className="text-sm font-normal text-muted-foreground">
									/ {planPeriod === 'annual' ? t('billedAnnually') : t('perMonth')}
								</span>
							</p>
							{subscriptionItem?.periodEnd && (
								<p
									className={`text-xs text-muted-foreground mt-2 ${subscriptionItem.canceledAt ? 'text-red-600' : ''}`}
								>
									{subscriptionItem.canceledAt
										? t('expiresOn', {
												date: formatDate(subscriptionItem.periodEnd, { hideTime: true }),
											})
										: t('renewsOn', {
												date: formatDate(subscriptionItem.periodEnd, { hideTime: true }),
											})}
								</p>
							)}
						</div>
					)}
				</div>

				<div className="flex flex-wrap items-center gap-6 pt-4 border-t">
					{!hasProPlan || subscriptionItem?.canceledAt ? (
						<>
							<CheckoutButton
								planId={env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID}
								planPeriod={selectedPeriod}
								onSubscriptionComplete={() => {
									revalidate();
									posthog.capture('subscription:created');
								}}
								newSubscriptionRedirectUrl={pathname}
							>
								<Button size="sm">
									<SparklesIcon className="size-4 mr-2" />
									{hasProPlan && subscriptionItem?.canceledAt
										? t('renewSubscription')
										: t('upgradeToPro')}
								</Button>
							</CheckoutButton>
							<Label
								htmlFor="billing-period"
								className="text-sm text-muted-foreground cursor-pointer flex items-center gap-2"
							>
								{tPlans('annual')}
								<Switch
									id="billing-period"
									checked={selectedPeriod === 'annual'}
									onCheckedChange={(checked) => setSelectedPeriod(checked ? 'annual' : 'month')}
								/>
							</Label>
						</>
					) : (
						<CancelPlanDialog subscriptionItem={subscriptionItem} revalidate={revalidate} />
					)}
				</div>
			</CardContent>
		</Card>
	);
}
