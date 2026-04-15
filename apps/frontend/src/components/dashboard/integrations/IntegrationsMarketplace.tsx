'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useListAnalyticsIntegrationsQuery } from '@/lib/api/analytics-integration';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useIntegrationFilter } from '@/hooks/use-integration-filter';
import { INTEGRATIONS_CATALOG, type IntegrationCatalogEntry } from '@/lib/integrations-catalog';
import type { TAnalyticsIntegrationResponseDto } from '@shared/schemas';
import { AnalyticsProviderCard } from './AnalyticsProviderCard';
import { TagFilterBar } from './TagFilterBar';
import { ExternalLinkCard } from './ExternalLinkCard';
import { ComingSoonCard } from './ComingSoonCard';

export function IntegrationsMarketplace() {
	const t = useTranslations('settings.integrations');
	const { hasProPlan } = useHasProPlan();
	const { data: integrations, isLoading } = useListAnalyticsIntegrationsQuery();

	const existingIntegration = integrations?.[0] ?? undefined;
	const isProExpired = !hasProPlan && !!existingIntegration && !existingIntegration.isEnabled;

	const { activeTag, setActiveTag, filteredEntries, availableTags } =
		useIntegrationFilter(INTEGRATIONS_CATALOG);

	return (
		<div className="flex flex-col gap-4">
			{isProExpired && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{t('integrationDisabledTitle')}</AlertTitle>
					<AlertDescription>{t('integrationDisabledDescription')}</AlertDescription>
				</Alert>
			)}

			<TagFilterBar
				activeTag={activeTag}
				onTagChange={setActiveTag}
				availableTags={availableTags}
			/>

			{isLoading ? (
				<div className="flex flex-col gap-3">
					<Skeleton className="h-20 w-full rounded-md" />
					<Skeleton className="h-20 w-full rounded-md" />
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{filteredEntries.map((entry) =>
						renderCard(entry, {
							existingIntegration,
							hasProPlan,
							isProExpired,
						}),
					)}
				</div>
			)}

			<p className="mt-1 px-1 text-sm text-muted-foreground">
				{t.rich('moreIntegrationsTeaser', {
					contact: (chunks) => (
						<a href="mailto:info@qrcodly.de" className="underline hover:text-foreground">
							{chunks}
						</a>
					),
				})}
			</p>
		</div>
	);
}

type RenderContext = {
	existingIntegration: TAnalyticsIntegrationResponseDto | undefined;
	hasProPlan: boolean;
	isProExpired: boolean;
};

function renderCard(entry: IntegrationCatalogEntry, ctx: RenderContext) {
	if (entry.kind === 'analytics') {
		const integration =
			ctx.existingIntegration?.providerType === entry.providerType
				? ctx.existingIntegration
				: undefined;
		return (
			<AnalyticsProviderCard
				key={entry.id}
				providerType={entry.providerType}
				integration={integration}
				canConfigure={ctx.hasProPlan}
				hasOtherIntegration={!!ctx.existingIntegration && !integration}
				isProExpired={ctx.isProExpired}
			/>
		);
	}
	if (entry.kind === 'external-link') {
		return <ExternalLinkCard key={entry.id} entry={entry} />;
	}
	return <ComingSoonCard key={entry.id} entry={entry} />;
}
