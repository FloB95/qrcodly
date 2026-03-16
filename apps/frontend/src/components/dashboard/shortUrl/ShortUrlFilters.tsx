'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlassIcon, XMarkIcon, TagIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { useTranslations } from 'next-intl';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { ShortUrlFilters as ShortUrlFiltersType } from '@/lib/api/url-shortener';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useListTagsQuery } from '@/lib/api/tag';
import posthog from 'posthog-js';

interface ShortUrlFiltersProps {
	filters: ShortUrlFiltersType;
	onFiltersChange: (filters: ShortUrlFiltersType) => void;
}

export function ShortUrlFilters({ filters, onFiltersChange }: ShortUrlFiltersProps) {
	const t = useTranslations('collection.filters');
	const tShortUrl = useTranslations('shortUrl');
	const tTags = useTranslations('tags');
	const [searchValue, setSearchValue] = useState(filters.search ?? '');
	const [debouncedSearch] = useDebouncedValue(searchValue, 400);
	const [tagSearch, setTagSearch] = useState('');
	const [debouncedTagSearch] = useDebouncedValue(tagSearch, 300);
	const { data: tagsData } = useListTagsQuery(1, 50, debouncedTagSearch || undefined);
	const allTags = tagsData?.data;
	const selectedTagsCacheRef = useRef<Map<string, { id: string; name: string; color: string }>>(
		new Map(),
	);

	useEffect(() => {
		if (allTags) {
			for (const tag of allTags) {
				selectedTagsCacheRef.current.set(tag.id, { id: tag.id, name: tag.name, color: tag.color });
			}
		}
	}, [allTags]);

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

	const handleTagToggle = useCallback(
		(tagId: string) => {
			const current = filters.tagIds ?? [];
			const isAdding = !current.includes(tagId);
			const updated = isAdding ? [...current, tagId] : current.filter((id) => id !== tagId);
			posthog.capture('short-url-list:filter-tag-toggled', { tagId, active: isAdding });
			onFiltersChange({
				...filters,
				tagIds: updated.length > 0 ? updated : undefined,
			});
		},
		[filters, onFiltersChange],
	);

	const hasActiveFilters = !!filters.search || !!filters.tagIds?.length;

	const handleClearAll = useCallback(() => {
		setSearchValue('');
		onFiltersChange({});
	}, [onFiltersChange]);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative w-full sm:flex-1 sm:w-auto sm:min-w-[200px] sm:max-w-sm">
					<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder={tShortUrl('searchPlaceholder')}
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

				{/* Tag Filter */}
				<Popover
					onOpenChange={(open) => {
						if (!open) setTagSearch('');
					}}
				>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn('h-9 gap-1.5', filters.tagIds?.length && 'border-primary text-primary')}
						>
							<TagIcon className="h-4 w-4" />
							<span className="hidden lg:inline">{tTags('title')}</span>
							{filters.tagIds?.length ? (
								<Badge variant="blue" className="ml-1 px-1.5 py-0 text-[10px]">
									{filters.tagIds.length}
								</Badge>
							) : null}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-72 p-2" align="start">
						<div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
							{tTags('filterByTags')}
						</div>
						<div className="relative mb-2">
							<MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								type="text"
								placeholder={tTags('searchTags')}
								value={tagSearch}
								onChange={(e) => setTagSearch(e.target.value)}
								className="pl-8 h-8 text-xs"
							/>
						</div>
						{!allTags || allTags.length === 0 ? (
							<div className="text-xs text-muted-foreground px-2 py-2">{tTags('noTags')}</div>
						) : (
							<div className="grid gap-1 max-h-52 overflow-y-auto">
								{allTags.map((tag) => {
									const isSelected = filters.tagIds?.includes(tag.id) ?? false;
									return (
										<button
											key={tag.id}
											onClick={() => handleTagToggle(tag.id)}
											className={cn(
												'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent min-w-0',
												isSelected && 'bg-accent font-medium',
											)}
										>
											<div
												className={cn(
													'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
													isSelected
														? 'border-primary bg-primary text-primary-foreground'
														: 'border-muted-foreground/30',
												)}
											>
												{isSelected && <CheckIcon className="h-3 w-3" />}
											</div>
											<div
												className="size-3 rounded-full shrink-0"
												style={{ backgroundColor: tag.color }}
											/>
											<span className="truncate">{tag.name}</span>
										</button>
									);
								})}
							</div>
						)}
					</PopoverContent>
				</Popover>

				{/* Clear All */}
				{hasActiveFilters && (
					<Button variant="ghost" size="sm" onClick={handleClearAll} className="h-9 gap-1.5">
						<XMarkIcon className="h-4 w-4" />
						<span className="hidden lg:inline">{t('clearAll')}</span>
					</Button>
				)}
			</div>

			{/* Active tag filter badges */}
			{filters.tagIds && filters.tagIds.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{filters.tagIds.map((tagId) => {
						const tag =
							allTags?.find((t) => t.id === tagId) ?? selectedTagsCacheRef.current.get(tagId);
						if (!tag) return null;
						return (
							<Badge
								key={tagId}
								variant="secondary"
								className="gap-1 pr-1 cursor-pointer hover:bg-secondary/60"
								onClick={() => handleTagToggle(tagId)}
							>
								<div
									className="size-2.5 rounded-full shrink-0"
									style={{ backgroundColor: tag.color }}
								/>
								{tag.name}
								<XMarkIcon className="h-3 w-3 ml-0.5" />
							</Badge>
						);
					})}
				</div>
			)}
		</div>
	);
}
