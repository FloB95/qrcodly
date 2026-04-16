'use client';

import { useMemo, useState } from 'react';
import type { IntegrationCatalogEntry, IntegrationTag } from '@/lib/integrations-catalog';

export function deriveAvailableTags(catalog: IntegrationCatalogEntry[]): IntegrationTag[] {
	const seen = new Set<IntegrationTag>();
	for (const entry of catalog) {
		for (const tag of entry.tags) {
			seen.add(tag);
		}
	}
	return Array.from(seen);
}

export function filterEntries(
	catalog: IntegrationCatalogEntry[],
	activeTag: IntegrationTag | null,
): IntegrationCatalogEntry[] {
	if (activeTag === null) {
		return catalog;
	}
	return catalog.filter((entry) => entry.tags.includes(activeTag));
}

export type UseIntegrationFilterResult = {
	activeTag: IntegrationTag | null;
	setActiveTag: (tag: IntegrationTag | null) => void;
	filteredEntries: IntegrationCatalogEntry[];
	availableTags: IntegrationTag[];
};

export function useIntegrationFilter(
	catalog: IntegrationCatalogEntry[],
): UseIntegrationFilterResult {
	const [activeTag, setActiveTag] = useState<IntegrationTag | null>(null);

	const availableTags = useMemo(() => deriveAvailableTags(catalog), [catalog]);
	const filteredEntries = useMemo(() => filterEntries(catalog, activeTag), [catalog, activeTag]);

	return { activeTag, setActiveTag, filteredEntries, availableTags };
}
