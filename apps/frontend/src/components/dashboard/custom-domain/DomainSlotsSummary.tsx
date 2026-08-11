'use client';

import { useTranslations } from 'next-intl';
import { useDomainAddonQuery } from '@/lib/api/domain-addon';
import { useHasProPlan } from '@/hooks/useHasProPlan';

/**
 * One quiet line above the domain table: how many slots are in use and where they come from.
 *
 * Deliberately not a card — the billing state (scheduled reductions, cancellations, cost) lives on
 * the billing page; here it would only push the table down.
 */
export function DomainSlotsSummary() {
	const t = useTranslations('settings.domains.addon');
	const { hasProPlan } = useHasProPlan();
	const { data } = useDomainAddonQuery();

	const entitlement = data?.entitlement;
	if (!hasProPlan || !entitlement) return null;

	return (
		<p className="text-right text-xs text-muted-foreground">
			{t('slotsUsed', {
				used: entitlement.usedDomains,
				total: entitlement.effectiveLimit,
			})}
			{' · '}
			{t('breakdown', { base: entitlement.baseLimit, extra: entitlement.addonSlots })}
		</p>
	);
}
