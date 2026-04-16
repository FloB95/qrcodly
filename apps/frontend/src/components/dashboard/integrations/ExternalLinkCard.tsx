'use client';

import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ExternalLinkIntegrationEntry } from '@/lib/integrations-catalog';
import { IntegrationLogo } from './IntegrationLogo';

type ExternalLinkCardProps = {
	entry: ExternalLinkIntegrationEntry;
};

export function ExternalLinkCard({ entry }: ExternalLinkCardProps) {
	const t = useTranslations('settings.integrations.catalog');

	const handleClick = () => {
		posthog.capture('integrations:external-link-clicked', {
			integrationId: entry.id,
			href: entry.href,
		});
	};

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
				<Button variant="outline" size="sm" asChild>
					<a href={entry.href} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
						{t(entry.ctaKey)}
					</a>
				</Button>
			</ItemActions>
		</Item>
	);
}
