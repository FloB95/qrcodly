'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useListAnalyticsIntegrationsQuery } from '@/lib/api/analytics-integration';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { ProviderCard } from './ProviderCard';
import type { TProviderType } from '@shared/schemas';

const PROVIDER_TYPES: TProviderType[] = ['google_analytics', 'matomo'];

export function AnalyticsIntegrationPage() {
	const t = useTranslations('settings.integrations');
	const { hasProPlan } = useHasProPlan();
	const { data: integrations, isLoading } = useListAnalyticsIntegrationsQuery();

	const existingIntegration = integrations?.[0] ?? undefined;
	const isProExpired = !hasProPlan && !!existingIntegration;

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
			{isProExpired && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{t('integrationDisabledTitle')}</AlertTitle>
					<AlertDescription>{t('integrationDisabledDescription')}</AlertDescription>
				</Alert>
			)}
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
						isProExpired={isProExpired}
					/>
				);
			})}
		</div>
	);
}
