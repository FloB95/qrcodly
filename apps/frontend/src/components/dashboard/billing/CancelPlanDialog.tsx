'use client';

import { useState } from 'react';
import { useClerk } from '@clerk/nextjs';
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

export function CancelPlanDialog() {
	const t = useTranslations('settings.billing');
	const { openUserProfile } = useClerk();
	const [open, setOpen] = useState(false);

	const handleManageSubscription = () => {
		setOpen(false);
		openUserProfile({
			__experimental_startPath: '/billing',
		});
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
					<AlertDialogCancel>{t('keepPlan')}</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleManageSubscription}
						className="bg-destructive text-white hover:bg-destructive/90"
					>
						{t('proceedToCancel')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
