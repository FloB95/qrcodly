'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MAX_DOMAIN_ADDON_SLOTS } from '@shared/schemas';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Minus, Plus } from 'lucide-react';
import { useCreateDomainAddonCheckout } from '@/lib/api/domain-addon';
import { DOMAIN_ADDON_PRICES, multiplyPrice } from '@/lib/plan.config';
import { env } from '@/env';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function BuyDomainSlotsDialog({ open, onOpenChange }: Props) {
	const t = useTranslations('settings.domains.addon');
	const locale = useLocale();
	const [quantity, setQuantity] = useState(1);
	// Opens on annual billing to match the "from 2,99 €" price quoted in the CTAs.
	const [isAnnual, setIsAnnual] = useState(true);

	const checkout = useCreateDomainAddonCheckout();

	const unitPrice = isAnnual ? DOMAIN_ADDON_PRICES.annual : DOMAIN_ADDON_PRICES.monthly;
	const priceId = isAnnual
		? env.NEXT_PUBLIC_STRIPE_ADDON_DOMAIN_PRICE_ID_ANNUAL
		: env.NEXT_PUBLIC_STRIPE_ADDON_DOMAIN_PRICE_ID_MONTHLY;

	const handleSubmit = () => {
		posthog.capture('domain-addon:checkout_started', {
			quantity,
			period: isAnnual ? 'annual' : 'month',
		});

		checkout.mutate(
			{ priceId, quantity, locale },
			{
				onError: (error) => {
					toast({
						title: t('purchaseError'),
						description: error.message,
						variant: 'destructive',
					});
					Sentry.captureException(error);
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle>{t('buyTitle')}</DialogTitle>
					<DialogDescription>{t('buyDescription')}</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					<div className="flex items-center justify-between">
						<Label htmlFor="addon-quantity">{t('quantity')}</Label>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label={t('decrease')}
								disabled={quantity <= 1}
								onClick={() => setQuantity((value) => Math.max(1, value - 1))}
							>
								<Minus className="h-4 w-4" />
							</Button>
							<span id="addon-quantity" className="w-8 text-center tabular-nums font-medium">
								{quantity}
							</span>
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label={t('increase')}
								disabled={quantity >= MAX_DOMAIN_ADDON_SLOTS}
								onClick={() => setQuantity((value) => Math.min(MAX_DOMAIN_ADDON_SLOTS, value + 1))}
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<Label htmlFor="addon-billing-period">{t('billedAnnually')}</Label>
						<Switch id="addon-billing-period" checked={isAnnual} onCheckedChange={setIsAnnual} />
					</div>

					<div className="rounded-lg border bg-muted/40 p-4 space-y-1">
						<p className="text-sm text-muted-foreground">
							{t('pricePerDomain', { price: unitPrice })}
						</p>
						<p className="text-lg font-semibold">
							{isAnnual
								? t('totalAnnual', {
										total: multiplyPrice(DOMAIN_ADDON_PRICES.annualTotal, quantity),
									})
								: t('totalMonthly', { total: multiplyPrice(unitPrice, quantity) })}
						</p>
						<p className="text-xs text-muted-foreground">{t('noRefundNotice')}</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={checkout.isPending}
					>
						{t('cancel')}
					</Button>
					<Button type="button" onClick={handleSubmit} disabled={checkout.isPending}>
						{checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{t('continueToCheckout')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
