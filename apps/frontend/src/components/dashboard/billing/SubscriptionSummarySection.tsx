'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import {
	BuyDomainSlotsDialog,
	ManageDomainSlotsDialog,
} from '@/components/dashboard/custom-domain';
import {
	useCancelScheduledDomainAddonReduction,
	useDomainAddonQuery,
	useReactivateDomainAddon,
} from '@/lib/api/domain-addon';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useOpenBillingPortal } from '@/lib/api/billing';
import {
	DOMAIN_ADDON_PRICES,
	formatPrice,
	getProPricing,
	multiplyPrice,
	parsePrice,
} from '@/lib/plan.config';
import { env } from '@/env';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

/**
 * What the customer actually pays, line by line, plus the controls to change it.
 *
 * The plan card above only ever describes Pro, so without this the add-on is invisible on the very
 * page people open with a billing question. It is also the only place a quantity can be reduced:
 * the Stripe portal can cancel a subscription but not change its quantity.
 */
export function SubscriptionSummarySection() {
	const t = useTranslations('settings.billing');
	const locale = useLocale();
	const { hasProPlan, isCanceled, isLoading: isPlanLoading, subscription } = useHasProPlan();
	const { data, isLoading } = useDomainAddonQuery();
	const reactivate = useReactivateDomainAddon();
	const cancelReduction = useCancelScheduledDomainAddonReduction();
	// Same destination as the header's invoices button — the portal is a dead end with no way
	// back, so it opens in its own tab.
	const billingPortal = useOpenBillingPortal();

	const [buyOpen, setBuyOpen] = useState(false);
	const [manageOpen, setManageOpen] = useState(false);

	const formatDate = (isoDate: string) =>
		new Date(isoDate).toLocaleDateString(locale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

	if (isPlanLoading || isLoading) {
		return <Skeleton className="h-40 w-full" />;
	}

	if (!hasProPlan) return null;

	const addon = data?.addon ?? null;
	const pro = getProPricing(subscription?.stripePriceId);
	const isAddonAnnual =
		addon?.stripePriceId === env.NEXT_PUBLIC_STRIPE_ADDON_DOMAIN_PRICE_ID_ANNUAL;
	const addonUnitPrice = isAddonAnnual ? DOMAIN_ADDON_PRICES.annual : DOMAIN_ADDON_PRICES.monthly;
	const addonMonthly = addon ? multiplyPrice(addonUnitPrice, addon.quantity) : '0,00';

	// Everything is expressed per month so an annual plan and a monthly add-on can be summed.
	const total = formatPrice(parsePrice(pro.monthlyPrice) + parsePrice(addonMonthly));

	const handleReactivate = () => {
		reactivate.mutate(undefined, {
			onSuccess: () => {
				posthog.capture('domain-addon:reactivated', { quantity: addon?.quantity });
				toast({ title: t('addon.reactivated') });
			},
			onError: (error) => {
				posthog.capture('error:domain-addon-reactivate', { message: error.message });
				toast({
					title: t('addon.reactivateError'),
					description: error.message,
					variant: 'destructive',
				});
				Sentry.captureException(error);
			},
		});
	};

	const handleCancelReduction = () => {
		cancelReduction.mutate(undefined, {
			onSuccess: () => {
				posthog.capture('domain-addon:reduction_withdrawn', {
					quantity: addon?.quantity,
					scheduledQuantity: addon?.scheduledQuantity,
					source: 'billing_summary',
				});
				toast({ title: t('addon.pendingReductionUndone') });
			},
			onError: (error) => {
				posthog.capture('error:domain-addon-reduction-withdraw', { message: error.message });
				toast({
					title: t('addon.pendingReductionUndoError'),
					description: error.message,
					variant: 'destructive',
				});
				Sentry.captureException(error);
			},
		});
	};

	return (
		<>
			<Card className="@container/card">
				<CardContent className="px-4 sm:px-6 space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<CardTitle className="mb-0.5">{t('summary.title')}</CardTitle>
							<CardDescription>{t('summary.description')}</CardDescription>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="w-full sm:w-auto shrink-0"
							onClick={() => {
								posthog.capture('billing:portal_opened', { source: 'subscription_summary' });
								billingPortal.open(locale);
							}}
							disabled={billingPortal.isPending}
						>
							{t('summary.managePortal')}
							<ArrowTopRightOnSquareIcon className="size-4 ml-2" />
						</Button>
					</div>

					<ul className="divide-y rounded-lg border">
						<li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
							<div>
								<p className="text-sm font-medium">{t('summary.proLabel')}</p>
								<p className="text-xs text-muted-foreground">
									{pro.isAnnual ? t('billedAnnually') : t('billedMonthly')}
									{subscription?.currentPeriodEnd &&
										` · ${
											isCanceled
												? t('expiresOn', {
														date: formatDate(subscription.currentPeriodEnd),
													})
												: t('renewsOn', { date: formatDate(subscription.currentPeriodEnd) })
										}`}
								</p>
							</div>
							<p className="text-sm font-medium tabular-nums">
								{t('summary.perMonth', { price: pro.monthlyPrice })}
							</p>
						</li>

						{addon ? (
							<li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
								<div>
									<p className="text-sm font-medium">
										{t('summary.addonLabel', { quantity: addon.quantity })}
									</p>
									<p className="text-xs text-muted-foreground">
										{t('summary.addonUnit', {
											quantity: addon.quantity,
											unit: addonUnitPrice,
										})}
										{isAddonAnnual ? ` · ${t('billedAnnually')}` : ` · ${t('billedMonthly')}`}
										{addon.cancelAtPeriodEnd
											? ` · ${t('expiresOn', { date: formatDate(addon.currentPeriodEnd) })}`
											: ` · ${t('renewsOn', { date: formatDate(addon.currentPeriodEnd) })}`}
									</p>
								</div>
								<div className="flex items-center gap-3">
									<p className="text-sm font-medium tabular-nums">
										{t('summary.perMonth', { price: addonMonthly })}
									</p>
									<Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
										{t('addon.manage')}
									</Button>
								</div>
							</li>
						) : (
							<li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
								<div>
									<p className="text-sm font-medium">{t('summary.addonEmptyLabel')}</p>
									<p className="text-xs text-muted-foreground">{t('addon.emptyDescription')}</p>
								</div>
								<Button size="sm" onClick={() => setBuyOpen(true)}>
									{t('addon.buy', { price: DOMAIN_ADDON_PRICES.entry })}
								</Button>
							</li>
						)}

						<li className="flex items-center justify-between px-4 py-3 bg-muted/40">
							<p className="text-sm font-semibold">{t('summary.totalLabel')}</p>
							<p className="text-sm font-semibold tabular-nums">
								{t('summary.perMonth', { price: total })}
							</p>
						</li>
					</ul>

					{addon?.scheduledQuantity != null && addon.scheduledQuantityEffectiveAt && (
						<Alert>
							<Clock className="h-4 w-4" />
							<AlertTitle>{t('addon.pendingReductionTitle')}</AlertTitle>
							<AlertDescription className="flex flex-col items-start gap-2">
								<span>
									{t('addon.pendingReductionDescription', {
										quantity: addon.scheduledQuantity,
										date: formatDate(addon.scheduledQuantityEffectiveAt),
									})}
								</span>
								<Button
									size="sm"
									variant="outline"
									onClick={handleCancelReduction}
									disabled={cancelReduction.isPending}
								>
									{cancelReduction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{t('addon.pendingReductionUndo')}
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{addon?.cancelAtPeriodEnd && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>{t('addon.cancelScheduled')}</AlertTitle>
							<AlertDescription className="flex flex-col items-start gap-2">
								<span>
									{t('addon.cancelScheduledDescription', {
										date: formatDate(addon.currentPeriodEnd),
									})}
								</span>
								<Button
									size="sm"
									variant="outline"
									onClick={handleReactivate}
									disabled={reactivate.isPending}
								>
									{reactivate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{t('addon.reactivate')}
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{addon && <p className="text-sm text-muted-foreground">{t('addon.cancelHint')}</p>}
				</CardContent>
			</Card>

			<BuyDomainSlotsDialog open={buyOpen} onOpenChange={setBuyOpen} />
			{addon && (
				<ManageDomainSlotsDialog
					open={manageOpen}
					onOpenChange={setManageOpen}
					addon={addon}
					formatDate={formatDate}
				/>
			)}
		</>
	);
}
