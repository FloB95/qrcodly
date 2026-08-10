'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useDomainAddonQuery, useReactivateDomainAddon } from '@/lib/api/domain-addon';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { DOMAIN_ADDON_PRICES } from '@/lib/plan.config';
import { ManageDomainSlotsDialog } from './ManageDomainSlotsDialog';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';

/**
 * Shows how many custom domains the user may have, where those slots come from, and any change
 * that is already scheduled. Only rendered for Pro users — the add-on requires an active plan.
 */
export function DomainSlotsCard({ onBuySlots }: { onBuySlots: () => void }) {
	const t = useTranslations('settings.domains.addon');
	const locale = useLocale();
	const { hasProPlan, isLoading: isPlanLoading } = useHasProPlan();
	const { data, isLoading } = useDomainAddonQuery();
	const reactivate = useReactivateDomainAddon();

	const [manageOpen, setManageOpen] = useState(false);

	const formatDate = (isoDate: string) =>
		new Date(isoDate).toLocaleDateString(locale, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

	if (isPlanLoading || isLoading) {
		return <Skeleton className="h-24 w-full" />;
	}

	if (!hasProPlan) return null;

	const addon = data?.addon ?? null;
	const entitlement = data?.entitlement;
	if (!entitlement) return null;

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
			<Card>
				<CardContent className="px-4 sm:px-6 space-y-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="font-medium">
								{t('slotsUsed', {
									used: entitlement.usedDomains,
									total: entitlement.effectiveLimit,
								})}
							</p>
							<p className="text-sm text-muted-foreground">
								{t('breakdown', {
									base: entitlement.baseLimit,
									extra: entitlement.addonSlots,
								})}
							</p>
						</div>
						<div className="flex gap-2">
							{addon ? (
								<Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
									{t('manageSlots')}
								</Button>
							) : (
								<Button size="sm" onClick={onBuySlots}>
									{t('buySlots', { price: DOMAIN_ADDON_PRICES.monthly })}
								</Button>
							)}
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
									{t('cancelScheduledDescription', {
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
									{t('reactivate')}
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{!addon && entitlement.usedDomains >= entitlement.effectiveLimit && (
						<p className="text-sm text-muted-foreground">
							{t('atLimitHint', { price: DOMAIN_ADDON_PRICES.monthly })}
						</p>
					)}
				</CardContent>
			</Card>

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
