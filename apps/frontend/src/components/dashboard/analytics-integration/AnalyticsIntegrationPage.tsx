'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useListAnalyticsIntegrationsQuery } from '@/lib/api/analytics-integration';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { ProviderCard } from './ProviderCard';
import type { TProviderType } from '@shared/schemas';

const PROVIDER_TYPES: TProviderType[] = ['google_analytics', 'matomo'];

export function AnalyticsIntegrationPage() {
	const { hasProPlan } = useHasProPlan();
	const { data: integrations, isLoading } = useListAnalyticsIntegrationsQuery();

	const existingIntegration = integrations?.[0] ?? undefined;

	if (isLoading) {
		return (
			<div className="flex gap-3 flex-col">
				<Skeleton className="h-20 w-full rounded-md" />
				<Skeleton className="h-20 w-full rounded-md" />
			</div>
		);
	}

	return (
		<div className="flex gap-3 flex-col">
			{PROVIDER_TYPES.map((providerType) => {
				const integration =
					existingIntegration?.providerType === providerType ? existingIntegration : undefined;

				return (
					<ProviderCard
						key={providerType}
						providerType={providerType}
						integration={integration}
						canConfigure={hasProPlan}
						hasOtherIntegration={!!existingIntegration && !integration}
					/>
				);
			})}
		</div>
	);
}
