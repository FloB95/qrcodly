'use client';

import { useTranslations } from 'next-intl';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ComingSoonIntegrationEntry } from '@/lib/integrations-catalog';
import { IntegrationLogo } from './IntegrationLogo';

type ComingSoonCardProps = {
	entry: ComingSoonIntegrationEntry;
};

export function ComingSoonCard({ entry }: ComingSoonCardProps) {
	const t = useTranslations('settings.integrations.catalog');

	return (
		<Item variant="outline">
			<IntegrationLogo integrationId={entry.id} className="size-8" />
			<ItemContent>
				<ItemTitle className="flex flex-wrap items-center gap-2">
					{t(entry.nameKey)}
					{entry.tags.map((tag) => (
						<Badge key={tag} variant="outline" className="text-xs font-normal">
							{t(`tag.${tag}`)}
						</Badge>
					))}
				</ItemTitle>
				<ItemDescription>{t(entry.descriptionKey)}</ItemDescription>
			</ItemContent>
			<ItemActions>
				<Button variant="outline" size="sm" disabled>
					{t('comingSoonCta')}
				</Button>
			</ItemActions>
		</Item>
	);
}
