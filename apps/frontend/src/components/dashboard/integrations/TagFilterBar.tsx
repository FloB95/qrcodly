'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { IntegrationTag } from '@/lib/integrations-catalog';

type TagFilterBarProps = {
	activeTag: IntegrationTag | null;
	onTagChange: (tag: IntegrationTag | null) => void;
	availableTags: IntegrationTag[];
};

export function TagFilterBar({ activeTag, onTagChange, availableTags }: TagFilterBarProps) {
	const t = useTranslations('settings.integrations.catalog');

	if (availableTags.length <= 1) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2">
			<Button
				type="button"
				aria-pressed={activeTag === null}
				variant={activeTag === null ? 'default' : 'outline'}
				size="sm"
				onClick={() => onTagChange(null)}
			>
				{t('tagAll')}
			</Button>
			{availableTags.map((tag) => (
				<Button
					key={tag}
					type="button"
					aria-pressed={activeTag === tag}
					variant={activeTag === tag ? 'default' : 'outline'}
					size="sm"
					onClick={() => onTagChange(activeTag === tag ? null : tag)}
				>
					{t(`tag.${tag}`)}
				</Button>
			))}
		</div>
	);
}
