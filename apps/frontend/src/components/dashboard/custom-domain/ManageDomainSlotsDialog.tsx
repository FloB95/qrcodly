'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MAX_DOMAIN_ADDON_SLOTS, type TDomainAddonSubscriptionDto } from '@shared/schemas';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CreditCard, Loader2, Minus, Plus } from 'lucide-react';
import {
	useCancelDomainAddon,
	useDomainAddonQuantityPreview,
	useUpdateDomainAddonQuantity,
} from '@/lib/api/domain-addon';
import { DOMAIN_ADDON_PRICES, multiplyPrice } from '@/lib/plan.config';
import { env } from '@/env';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	addon: TDomainAddonSubscriptionDto;
	formatDate: (isoDate: string) => string;
};

export function ManageDomainSlotsDialog({ open, onOpenChange, addon, formatDate }: Props) {
	const t = useTranslations('settings.domains.addon');
	const locale = useLocale();
	const [quantity, setQuantity] = useState(addon.quantity);

	const updateQuantity = useUpdateDomainAddonQuantity();
	const cancelAddon = useCancelDomainAddon();

	// Returning to the current count is a real change while a reduction is parked: it withdraws it.
	const isSameQuantity = quantity === addon.quantity;
	const isUnchanged = isSameQuantity && addon.scheduledQuantity == null;
	const isAnnualAddon = addon.stripePriceId === env.NEXT_PUBLIC_STRIPE_ADDON_DOMAIN_PRICE_ID_ANNUAL;

	const preview = useDomainAddonQuantityPreview(quantity, open && !isSameQuantity);

	// The dialog stays mounted between openings, so reset to the server value each time.
	useEffect(() => {
		if (open) setQuantity(addon.quantity);
	}, [open, addon.quantity]);

	// A cancelled term cannot be re-planned; the backend refuses it, so do not offer it either.
	const isLocked = addon.cancelAtPeriodEnd;
	const isPending = updateQuantity.isPending || cancelAddon.isPending;
	const quote = preview.data;
	// Only an increase costs anything. A reduction quotes zero, so the amount alone cannot tell
	// the two apart — the mode can.
	const isCharge = quote?.mode === 'immediate';

	const formatMoney = (minorUnits: number, currency: string) =>
		new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() }).format(
			Math.abs(minorUnits) / 100,
		);

	const handleError = (title: string, event: string) => (error: Error) => {
		toast({ title, description: error.message, variant: 'destructive' });
		posthog.capture(event, { message: error.message });
		Sentry.captureException(error);
	};

	const handleSave = () => {
		updateQuantity.mutate(
			{ quantity, prorationDate: quote?.prorationDate },
			{
				onSuccess: (result) => {
					onOpenChange(false);
					const isReduction = result.scheduledQuantity != null && result.effectiveAt;
					// Three distinct outcomes behind one button — an increase billed now, a
					// reduction parked for the renewal, and withdrawing a parked one. Funnelling
					// them into one event would make the paid path unmeasurable.
					posthog.capture(
						isReduction
							? 'domain-addon:reduction_scheduled'
							: quantity === addon.quantity
								? 'domain-addon:reduction_withdrawn'
								: 'domain-addon:quantity_increased',
						{
							from: addon.quantity,
							to: quantity,
							amountDueNow: quote?.amountDueNow ?? 0,
							currency: quote?.currency,
							willDisableCount: quote?.willDisable.length ?? 0,
						},
					);
					toast({
						title: t('updated'),
						description: isReduction
							? t('reductionScheduled', {
									date: formatDate(result.effectiveAt!),
									quantity: result.scheduledQuantity!,
								})
							: t('quantityIncreased', { quantity: result.quantity }),
					});
				},
				onError: handleError(t('updateError'), 'error:domain-addon-quantity-update'),
			},
		);
	};

	const handleCancelAddon = () => {
		cancelAddon.mutate(undefined, {
			onSuccess: (result) => {
				onOpenChange(false);
				posthog.capture('domain-addon:cancel_scheduled', {
					quantity: addon.quantity,
					willDisableCount: result.willDisable.length,
				});
				toast({
					title: t('cancelScheduled'),
					description: result.effectiveAt
						? t('cancelScheduledDescription', { date: formatDate(result.effectiveAt) })
						: undefined,
				});
			},
			onError: handleError(t('cancelError'), 'error:domain-addon-cancel'),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>{t('manageTitle')}</DialogTitle>
					<DialogDescription>
						{t('currentState', {
							quantity: addon.quantity,
							date: formatDate(addon.currentPeriodEnd),
						})}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">{t('quantity')}</span>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label={t('decrease')}
								disabled={quantity <= 1 || isPending || isLocked}
								onClick={() => setQuantity((value) => Math.max(1, value - 1))}
							>
								<Minus className="h-4 w-4" />
							</Button>
							<span
								aria-live="polite"
								className="w-10 text-center text-base font-semibold tabular-nums"
							>
								{quantity}
							</span>
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label={t('increase')}
								disabled={quantity >= MAX_DOMAIN_ADDON_SLOTS || isPending || isLocked}
								onClick={() => setQuantity((value) => Math.min(MAX_DOMAIN_ADDON_SLOTS, value + 1))}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Withdrawing a parked reduction needs no quote — it costs nothing and changes
					    nothing today. */}
					{isSameQuantity && addon.scheduledQuantity != null && (
						<p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
							{t('reductionWithdrawExplainer')}
						</p>
					)}

					{!isSameQuantity && (
						<div className="rounded-lg border bg-muted/40 p-4 text-sm">
							{preview.isPending ? (
								<div className="space-y-2">
									<Skeleton className="h-5 w-40" />
									<Skeleton className="h-4 w-56" />
								</div>
							) : preview.isError || !quote ? (
								<p className="flex items-start gap-2 text-destructive">
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
									{t('previewError')}
								</p>
							) : (
								<div className="space-y-2">
									<div className="flex items-baseline justify-between gap-3">
										<span className="text-muted-foreground">{t('dueNowLabel')}</span>
										<span className="text-lg font-semibold tabular-nums">
											{isCharge ? formatMoney(quote.amountDueNow, quote.currency) : t('nothingDue')}
										</span>
									</div>
									<p className="text-muted-foreground">
										{isCharge
											? t('proratedUntil', { date: formatDate(quote.periodEnd) })
											: quote.effectiveAt
												? t('reductionEffective', {
														date: formatDate(quote.effectiveAt),
														quantity: quote.quantity,
													})
												: t('reductionWithdrawExplainer')}
									</p>
									{/* The follow-on price has to be visible before ordering, not just the
									    amount due today. */}
									<p className="text-muted-foreground">
										{isAnnualAddon
											? t('renewalNoticeAnnual', {
													total: multiplyPrice(DOMAIN_ADDON_PRICES.annualTotal, quantity),
													date: formatDate(quote.periodEnd),
												})
											: t('renewalNoticeMonthly', {
													total: multiplyPrice(DOMAIN_ADDON_PRICES.monthly, quantity),
													date: formatDate(quote.periodEnd),
												})}
									</p>
									{isCharge && quote.paymentMethod && (
										<p className="flex items-center gap-2 text-muted-foreground">
											<CreditCard className="h-4 w-4 shrink-0" />
											{t('chargedTo', {
												brand: quote.paymentMethod.brand.toUpperCase(),
												last4: quote.paymentMethod.last4,
											})}
										</p>
									)}
									{quote.willDisable.length > 0 && quote.effectiveAt && (
										<div className="pt-1">
											<p className="font-medium text-destructive">
												{t('willDisableTitle', { date: formatDate(quote.effectiveAt) })}
											</p>
											<ul className="list-inside list-disc text-destructive">
												{quote.willDisable.map((domain) => (
													<li key={domain}>{domain}</li>
												))}
											</ul>
											{/* The list is a projection: the user keeps every paid slot until the
											    date, so domains added in the meantime can lengthen it. */}
											<p className="pt-1 text-muted-foreground">{t('willDisableHint')}</p>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					<Separator />

					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-destructive hover:bg-transparent hover:text-destructive"
						onClick={handleCancelAddon}
						disabled={isPending || addon.cancelAtPeriodEnd}
					>
						{cancelAddon.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{t('cancelAddon')}
					</Button>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						{t('cancel')}
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={
							isPending ||
							isUnchanged ||
							isLocked ||
							(!isSameQuantity && (preview.isPending || preview.isError))
						}
					>
						{updateQuantity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{/* An order that costs money needs an unambiguous button label (§ 312j BGB). */}
						{isCharge ? t('confirmPaid') : t('confirmChange')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
