'use client';

import { useState } from 'react';
import {
	AddCustomDomainDialog,
	BuyDomainSlotsDialog,
	CustomDomainList,
} from '@/components/dashboard/custom-domain';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { ProPlanRequiredBadge } from '@/components/ProPlanRequiredBadge';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useDomainAddonQuery } from '@/lib/api/domain-addon';

export default function Page() {
	const t = useTranslations('settings.domains');
	const { hasProPlan } = useHasProPlan();
	const { data: addonData } = useDomainAddonQuery();
	const [buyOpen, setBuyOpen] = useState(false);

	const entitlement = addonData?.entitlement;
	const atLimit = !!entitlement && entitlement.usedDomains >= entitlement.effectiveLimit;

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
									<div>
										{t.rich('description', {
											link: (chunks) => (
												<Link
													href="/docs/guides/custom-domains"
													target="_blank"
													className="underline hover:text-foreground"
												>
													{chunks}
												</Link>
											),
										})}
									</div>
								</CardDescription>
							</div>
						</div>
						<div className="ml-[60px] sm:ml-0">
							{hasProPlan ? (
								<AddCustomDomainDialog atLimit={atLimit} onBuySlots={() => setBuyOpen(true)} />
							) : (
								<ProPlanRequiredBadge source="custom_domains" />
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<CustomDomainList />

			<BuyDomainSlotsDialog open={buyOpen} onOpenChange={setBuyOpen} />
		</>
	);
}
