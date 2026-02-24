'use client';

import { ArrowTopRightOnSquareIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useCreatePortalSession } from '@/lib/api/billing';

export function BillingHeader() {
	const t = useTranslations('settings.billing');
	const locale = useLocale();
	const { hasProPlan } = useHasProPlan();
	const createPortalSession = useCreatePortalSession();

	const handleManageBilling = () => {
		createPortalSession.mutate({ locale });
	};

	return (
		<Card className="@container/card">
			<CardContent className="relative px-4 sm:px-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="p-3 bg-primary/10 rounded-lg shrink-0">
							<CreditCardIcon className="size-6 sm:size-8 stroke-1" />
						</div>
						<div>
							<CardTitle className="mb-0.5">{t('title')}</CardTitle>
							<CardDescription>{t('description')}</CardDescription>
						</div>
					</div>
					{hasProPlan && (
						<Button
							variant="default"
							size="sm"
							className="w-full sm:w-auto shrink-0"
							onClick={handleManageBilling}
							disabled={createPortalSession.isPending}
						>
							{t('manageBilling')}
							<ArrowTopRightOnSquareIcon className="size-4 ml-2" />
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
