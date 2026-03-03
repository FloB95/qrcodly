'use client';

import { AnalyticsIntegrationPage } from '@/components/dashboard/analytics-integration';
import { PuzzlePieceIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { ProPlanRequiredBadge } from '@/components/ProPlanRequiredBadge';
import { useHasProPlan } from '@/hooks/useHasProPlan';

export default function Page() {
	const t = useTranslations('settings.integrations');
	const { hasProPlan } = useHasProPlan();

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center justify-between gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<PuzzlePieceIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('title')}</CardTitle>
								<CardDescription className="lg:max-w-[80%]">{t('description')}</CardDescription>
							</div>
						</div>
						<div className="ml-[60px] sm:ml-0">{!hasProPlan && <ProPlanRequiredBadge />}</div>
					</div>
				</CardContent>
			</Card>

			<AnalyticsIntegrationPage />
		</>
	);
}
