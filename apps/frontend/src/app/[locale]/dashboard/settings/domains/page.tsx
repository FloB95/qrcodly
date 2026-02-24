'use client';

import { AddCustomDomainDialog, CustomDomainList } from '@/components/dashboard/custom-domain';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { ProPlanRequiredBadge } from '@/components/ProPlanRequiredBadge';
import { useHasProPlan } from '@/hooks/useHasProPlan';

export default function Page() {
	const t = useTranslations('settings.domains');
	const { hasProPlan } = useHasProPlan();

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center justify-between gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<GlobeAltIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('title')}</CardTitle>
								<CardDescription>
									<div>{t('description')}</div>
								</CardDescription>
							</div>
						</div>
						<div>{hasProPlan ? <AddCustomDomainDialog /> : <ProPlanRequiredBadge />}</div>
					</div>
				</CardContent>
			</Card>

			<CustomDomainList />
		</>
	);
}
