'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { ShortUrlFilters as ShortUrlFiltersType } from '@/lib/api/url-shortener';

interface ShortUrlFiltersProps {
	filters: ShortUrlFiltersType;
	onFiltersChange: (filters: ShortUrlFiltersType) => void;
}

export function ShortUrlFilters({ filters, onFiltersChange }: ShortUrlFiltersProps) {
	const t = useTranslations('collection.filters');
	const [searchValue, setSearchValue] = useState(filters.search ?? '');
	const [debouncedSearch] = useDebouncedValue(searchValue, 400);

	useEffect(() => {
		const externalSearch = filters.search ?? '';
		if (externalSearch !== searchValue.trim()) {
			setSearchValue(externalSearch);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters.search]);

	useEffect(() => {
		const trimmed = debouncedSearch.trim();
		if (trimmed !== (filters.search ?? '')) {
			onFiltersChange({ ...filters, search: trimmed || undefined });
		}
	}, [debouncedSearch, filters, onFiltersChange]);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="relative w-full sm:flex-1 sm:w-auto sm:min-w-[200px] sm:max-w-sm">
				<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder={t('searchPlaceholder')}
					value={searchValue}
					onChange={(e) => setSearchValue(e.target.value)}
					className="pl-9 pr-9 h-9 bg-background"
				/>
				{searchValue && (
					<button
						type="button"
						aria-label="Clear search"
						onClick={() => setSearchValue('')}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						<XMarkIcon className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
}
