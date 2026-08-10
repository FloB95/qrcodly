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
	useCancelPendingDomainAddonReduction,
	useDomainAddonQuantityPreview,
	useUpdateDomainAddonQuantity,
} from '@/lib/api/domain-addon';
import { DOMAIN_ADDON_PRICES, multiplyPrice } from '@/lib/plan.config';
import { env } from '@/env';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';

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
	const cancelPending = useCancelPendingDomainAddonReduction();

	const isUnchanged = quantity === addon.quantity;
	const isIncrease = quantity > addon.quantity;
	const isAnnualAddon = addon.stripePriceId === env.NEXT_PUBLIC_STRIPE_ADDON_DOMAIN_PRICE_ID_ANNUAL;

	const preview = useDomainAddonQuantityPreview(quantity, open && !isUnchanged);

	// The dialog stays mounted between openings, so reset to the server value each time.
	useEffect(() => {
		if (open) setQuantity(addon.quantity);
	}, [open, addon.quantity]);

	const isPending = updateQuantity.isPending || cancelAddon.isPending || cancelPending.isPending;
	const quote = preview.data;
	const requiresPendingReset = quote?.requiresPendingReset ?? false;

	const formatMoney = (minorUnits: number, currency: string) =>
		new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() }).format(
			minorUnits / 100,
		);

	const handleError = (title: string) => (error: Error) => {
		toast({ title, description: error.message, variant: 'destructive' });
		Sentry.captureException(error);
	};

	const handleSave = () => {
		updateQuantity.mutate(
			{ quantity, prorationDate: quote?.prorationDate },
			{
				onSuccess: (result) => {
					onOpenChange(false);
					toast({
						title: t('updated'),
						description: result.effectiveAt
							? t('reductionScheduled', { date: formatDate(result.effectiveAt) })
							: t('quantityIncreased', { quantity: result.quantity }),
					});
				},
				onError: handleError(t('updateError')),
			},
		);
	};

	const handleCancelAddon = () => {
		cancelAddon.mutate(undefined, {
			onSuccess: (result) => {
				onOpenChange(false);
				toast({
					title: t('cancelScheduled'),
					description: result.effectiveAt
						? t('cancelScheduledDescription', { date: formatDate(result.effectiveAt) })
						: undefined,
				});
			},
			onError: handleError(t('cancelError')),
		});
	};

	const handleWithdrawPending = () => {
		cancelPending.mutate(undefined, {
			onSuccess: () => toast({ title: t('pendingResetDone') }),
			onError: handleError(t('updateError')),
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
								disabled={quantity <= 1 || isPending}
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
								disabled={quantity >= MAX_DOMAIN_ADDON_SLOTS || isPending}
								onClick={() => setQuantity((value) => Math.min(MAX_DOMAIN_ADDON_SLOTS, value + 1))}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{!isUnchanged && (
						<div className="rounded-lg border bg-muted/40 p-4 text-sm">
							{preview.isPending ? (
								<div className="space-y-2">
									<Skeleton className="h-5 w-40" />
									<Skeleton className="h-4 w-56" />
								</div>
							) : preview.isError ? (
								<p className="flex items-start gap-2 text-destructive">
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
									{t('previewError')}
								</p>
							) : requiresPendingReset ? (
								<div className="space-y-3">
									<div>
										<p className="font-medium">{t('pendingResetTitle')}</p>
										<p className="text-muted-foreground">
											{t('pendingResetDescription', {
												quantity: addon.pendingQuantity ?? 0,
												date: addon.pendingQuantityEffectiveAt
													? formatDate(addon.pendingQuantityEffectiveAt)
													: '',
											})}
										</p>
									</div>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={handleWithdrawPending}
										disabled={isPending}
									>
										{cancelPending.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
										{t('pendingResetAction')}
									</Button>
								</div>
							) : quote && isIncrease ? (
								<div className="space-y-2">
									<div className="flex items-baseline justify-between gap-3">
										<span className="text-muted-foreground">{t('dueNowLabel')}</span>
										<span className="text-lg font-semibold tabular-nums">
											{formatMoney(quote.amountDueNow, quote.currency)}
										</span>
									</div>
									<p className="text-muted-foreground">
										{t('proratedUntil', { date: formatDate(quote.periodEnd) })}
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
									{quote.paymentMethod && (
										<p className="flex items-center gap-2 text-muted-foreground">
											<CreditCard className="h-4 w-4 shrink-0" />
											{t('chargedTo', {
												brand: quote.paymentMethod.brand.toUpperCase(),
												last4: quote.paymentMethod.last4,
											})}
										</p>
									)}
								</div>
							) : quote ? (
								<div className="space-y-2">
									<div className="flex items-baseline justify-between gap-3">
										<span className="text-muted-foreground">{t('dueNowLabel')}</span>
										<span className="text-lg font-semibold tabular-nums">
											{formatMoney(0, quote.currency)}
										</span>
									</div>
									<p className="text-muted-foreground">
										{t('reductionEffective', {
											quantity,
											date: formatDate(quote.periodEnd),
										})}
									</p>
									<p className="text-muted-foreground">{t('noRefundNotice')}</p>
									{quote.willDisable.length > 0 && (
										<div className="pt-1">
											<p className="font-medium text-destructive">{t('willDisableTitle')}</p>
											<ul className="list-inside list-disc text-destructive">
												{quote.willDisable.map((domain) => (
													<li key={domain}>{domain}</li>
												))}
											</ul>
										</div>
									)}
								</div>
							) : null}
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
						disabled={isPending || isUnchanged || requiresPendingReset || preview.isPending}
					>
						{updateQuantity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{/* An order that costs money needs an unambiguous button label (§ 312j BGB). */}
						{isIncrease ? t('confirmPaid') : t('confirmChange')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
