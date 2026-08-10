'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Minus, Plus } from 'lucide-react';
import { useCancelDomainAddon, useUpdateDomainAddonQuantity } from '@/lib/api/domain-addon';
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
	const [quantity, setQuantity] = useState(addon.quantity);

	const updateQuantity = useUpdateDomainAddonQuantity();
	const cancelAddon = useCancelDomainAddon();

	// The dialog stays mounted between openings, so reset to the server value each time.
	useEffect(() => {
		if (open) setQuantity(addon.quantity);
	}, [open, addon.quantity]);

	const isPending = updateQuantity.isPending || cancelAddon.isPending;
	const isReduction = quantity < addon.quantity;
	const isUnchanged = quantity === addon.quantity;

	const handleError = (title: string) => (error: Error) => {
		toast({ title, description: error.message, variant: 'destructive' });
		Sentry.captureException(error);
	};

	const handleSave = () => {
		updateQuantity.mutate(quantity, {
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
		});
	};

	const handleCancel = () => {
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle>{t('manageTitle')}</DialogTitle>
					<DialogDescription>{t('manageDescription')}</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					<div className="flex items-center justify-between">
						<Label htmlFor="manage-quantity">{t('quantity')}</Label>
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
							<span id="manage-quantity" className="w-8 text-center tabular-nums font-medium">
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

					{/* The asymmetry is the part users get wrong, so it is stated before confirming. */}
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>{t('changeNoticeTitle')}</AlertTitle>
						<AlertDescription>
							{isReduction
								? t('decreaseNotice', { date: formatDate(addon.currentPeriodEnd) })
								: t('increaseNotice')}
						</AlertDescription>
					</Alert>
				</div>

				<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						className="text-destructive hover:text-destructive"
						onClick={handleCancel}
						disabled={isPending || addon.cancelAtPeriodEnd}
					>
						{cancelAddon.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{t('cancelAddon')}
					</Button>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							{t('cancel')}
						</Button>
						<Button type="button" onClick={handleSave} disabled={isPending || isUnchanged}>
							{updateQuantity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{t('save')}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
