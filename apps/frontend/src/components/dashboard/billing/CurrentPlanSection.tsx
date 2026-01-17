'use client';

import { CheckoutButton, useSubscription } from '@clerk/nextjs/experimental';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { env } from '@/env';
import { CancelPlanDialog } from './CancelPlanDialog';
import { BillingSkeleton } from './BillingSkeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

const FREE_FEATURES = ['10 URL QR codes', '5 Text QR codes', 'Basic analytics', 'Standard support'];

const PRO_FEATURES = [
	'Unlimited URL QR codes',
	'Unlimited Text QR codes',
	'100 Event QR codes',
	'Advanced analytics',
	'Custom domains',
	'API access',
	'Priority support',
];

export function CurrentPlanSection() {
	const t = useTranslations('settings.billing');
	const { isLoading, isFetching, data } = useSubscription();

	if (isLoading || isFetching) {
		return <BillingSkeleton titleWidth="w-32" />;
	}

	const subscriptionItem = data?.subscriptionItems[0];
	const currentPlan = subscriptionItem?.plan;
	const planPeriod = (subscriptionItem?.planPeriod as 'annual' | 'month') || 'annual';
	const hasProPlan = currentPlan?.slug === 'pro';
	const features = hasProPlan ? PRO_FEATURES : FREE_FEATURES;

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
							<Badge className="text-teal-500" variant="outline">
								{hasProPlan ? 'Pro' : 'Free'}
							</Badge>
						</CardTitle>
						<CardDescription className="mt-1">
							{hasProPlan ? t('proDescription') : t('freeDescription')}
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
							{features.map((feature) => (
								<li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
									<CheckIcon className="size-4 text-primary shrink-0" />
									{feature}
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
								<p className="text-xs text-muted-foreground mt-2">
									{t('renewsOn', {
										date: formatDate(subscriptionItem.periodEnd, { hideTime: true }),
									})}
								</p>
							)}
						</div>
					)}
				</div>

				<div className="flex flex-wrap gap-3 pt-4 border-t">
					{!hasProPlan ? (
						<CheckoutButton planId={env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID} planPeriod="annual">
							<Button size="sm">
								<SparklesIcon className="size-4 mr-2" />
								{t('upgradeToPro')}
							</Button>
						</CheckoutButton>
					) : (
						<CancelPlanDialog />
					)}
				</div>
			</CardContent>
		</Card>
	);
}
