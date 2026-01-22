'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import type { SubscriptionItem } from './types';

interface CancelPlanDialogProps {
	subscriptionItem: SubscriptionItem;
	revalidate: () => void;
}

export function CancelPlanDialog({ subscriptionItem, revalidate }: CancelPlanDialogProps) {
	const t = useTranslations('settings.billing');
	const [open, setOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);

	const handleCancelSubscription = async () => {
		setIsPending(true);
		try {
			await subscriptionItem.cancel({});
			revalidate();
			setOpen(false);
			toast({
				title: t('cancelSuccess'),
			});
			posthog.capture('subscription:cancelled');
		} catch (error) {
			Sentry.captureException(error);
			posthog.capture('error:cancel-subscription', { error });
			toast({
				title: t('cancelError'),
				variant: 'destructive',
			});
		} finally {
			setIsPending(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button size="sm" variant="outline">
					{t('cancelPlan')}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('cancelPlanConfirmTitle')}</AlertDialogTitle>
					<AlertDialogDescription>{t('cancelPlanConfirmDescription')}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>{t('keepPlan')}</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleCancelSubscription}
						disabled={isPending}
						className="bg-destructive text-white hover:bg-destructive/90"
					>
						{isPending ? t('cancelling') : t('proceedToCancel')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
