'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import {
	BuyDomainSlotsDialog,
	ManageDomainSlotsDialog,
} from '@/components/dashboard/custom-domain';
import { useDomainAddonQuery, useReactivateDomainAddon } from '@/lib/api/domain-addon';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { DOMAIN_ADDON_PRICES, multiplyPrice } from '@/lib/plan.config';
import { env } from '@/env';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';

/**
 * Shows the extra-domain add-on on the billing page: what is booked, what it costs and when it
 * renews. Without this the add-on is invisible on the very page users open with a billing
 * question — the plan card alone only ever describes Pro.
 */
export function DomainAddonSection() {
	const t = useTranslations('settings.billing.addon');
	const locale = useLocale();
	const { hasProPlan, isLoading: isPlanLoading } = useHasProPlan();
	const { data, isLoading } = useDomainAddonQuery();
	const reactivate = useReactivateDomainAddon();

	const [buyOpen, setBuyOpen] = useState(false);
	const [manageOpen, setManageOpen] = useState(false);

	const formatDate = (isoDate: string) =>
		new Date(isoDate).toLocaleDateString(locale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

	if (isPlanLoading || isLoading) {
		return <Skeleton className="h-32 w-full" />;
	}

	if (!hasProPlan) return null;

	const addon = data?.addon ?? null;
	const isAnnual = addon?.stripePriceId === env.NEXT_PUBLIC_STRIPE_ADDON_DOMAIN_PRICE_ID_ANNUAL;
	const unitPrice = isAnnual ? DOMAIN_ADDON_PRICES.annual : DOMAIN_ADDON_PRICES.monthly;

	const handleReactivate = () => {
		reactivate.mutate(undefined, {
			onSuccess: () => toast({ title: t('reactivated') }),
			onError: (error) => {
				toast({ title: t('reactivateError'), description: error.message, variant: 'destructive' });
				Sentry.captureException(error);
			},
		});
	};

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6 space-y-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-start gap-3">
							<div className="p-3 bg-primary/10 rounded-lg shrink-0">
								<GlobeAltIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('title')}</CardTitle>
								<CardDescription>
									{addon
										? t('bookedDescription', { quantity: addon.quantity })
										: t('emptyDescription')}
								</CardDescription>

								{addon && (
									<p className="mt-2 text-sm font-medium">
										{isAnnual
											? t('costAnnual', {
													quantity: addon.quantity,
													unit: unitPrice,
													total: multiplyPrice(DOMAIN_ADDON_PRICES.annualTotal, addon.quantity),
												})
											: t('costMonthly', {
													quantity: addon.quantity,
													unit: unitPrice,
													total: multiplyPrice(unitPrice, addon.quantity),
												})}
									</p>
								)}

								{addon && !addon.cancelAtPeriodEnd && (
									<p className="mt-1 text-sm text-muted-foreground">
										{t('renewsOn', { date: formatDate(addon.currentPeriodEnd) })}
									</p>
								)}
							</div>
						</div>

						<div className="flex gap-2 ml-[60px] sm:ml-0 shrink-0">
							{addon && (
								<Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
									{t('manage')}
								</Button>
							)}
							<Button size="sm" onClick={() => setBuyOpen(true)} disabled={!!addon}>
								{t('buy', { price: DOMAIN_ADDON_PRICES.monthly })}
							</Button>
						</div>
					</div>

					{addon?.pendingQuantity != null && addon.pendingQuantityEffectiveAt && (
						<Alert>
							<Clock className="h-4 w-4" />
							<AlertTitle>{t('pendingReductionTitle')}</AlertTitle>
							<AlertDescription>
								{t('pendingReductionDescription', {
									quantity: addon.pendingQuantity,
									date: formatDate(addon.pendingQuantityEffectiveAt),
								})}
							</AlertDescription>
						</Alert>
					)}

					{addon?.cancelAtPeriodEnd && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>{t('cancelScheduled')}</AlertTitle>
							<AlertDescription className="flex flex-col items-start gap-2">
								<span>
									{t('cancelScheduledDescription', { date: formatDate(addon.currentPeriodEnd) })}
								</span>
								<Button
									size="sm"
									variant="outline"
									onClick={handleReactivate}
									disabled={reactivate.isPending}
								>
									{reactivate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{t('reactivate')}
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{addon && <p className="text-sm text-muted-foreground">{t('cancelHint')}</p>}
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
