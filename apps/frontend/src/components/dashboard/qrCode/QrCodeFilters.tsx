'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { CONTENT_TYPE_CONFIGS, getContentTypeConfig } from '@/lib/content-type.config';
import type { TQrCodeContentType } from '@shared/schemas';
import type { QrCodeFilters as QrCodeFiltersType } from '@/lib/api/qr-code';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAllTagsQuery } from '@/lib/api/tag';
import { TagIcon } from '@heroicons/react/24/outline';

type QrCodeFiltersProps = {
	filters: QrCodeFiltersType;
	onFiltersChange: (filters: QrCodeFiltersType) => void;
	className?: string;
};

export const QrCodeFilters = ({ filters, onFiltersChange, className }: QrCodeFiltersProps) => {
	const t = useTranslations('collection.filters');
	const tContent = useTranslations('generator.contentSwitch');
	const tTags = useTranslations('tags');
	const [searchValue, setSearchValue] = useState(filters.search ?? '');
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const { data: allTags } = useAllTagsQuery();

	// Debounce search input
	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			const trimmed = searchValue.trim();
			if (trimmed !== (filters.search ?? '')) {
				onFiltersChange({ ...filters, search: trimmed || undefined });
			}
		}, 400);

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [searchValue]);

	const handleContentTypeToggle = useCallback(
		(type: TQrCodeContentType) => {
			const current = filters.contentType ?? [];
			const updated = current.includes(type)
				? current.filter((t) => t !== type)
				: [...current, type];
			onFiltersChange({
				...filters,
				contentType: updated.length > 0 ? updated : undefined,
			});
		},
		[filters, onFiltersChange],
	);

	const handleTagToggle = useCallback(
		(tagId: string) => {
			const current = filters.tagIds ?? [];
			const updated = current.includes(tagId)
				? current.filter((id) => id !== tagId)
				: [...current, tagId];
			onFiltersChange({
				...filters,
				tagIds: updated.length > 0 ? updated : undefined,
			});
		},
		[filters, onFiltersChange],
	);

	const hasActiveFilters =
		!!filters.search || !!filters.contentType?.length || !!filters.tagIds?.length;

	const handleClearAll = useCallback(() => {
		setSearchValue('');
		onFiltersChange({});
	}, [onFiltersChange]);

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			<div className="flex flex-wrap items-center gap-2">
				{/* Search Input */}
				<div className="relative flex-1 min-w-[200px] max-w-sm">
					<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder={t('searchPlaceholder')}
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
						className="pl-9 pr-9 h-9 bg-white"
					/>
					{searchValue && (
						<button
							onClick={() => setSearchValue('')}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<XMarkIcon className="h-4 w-4" />
						</button>
					)}
				</div>

				{/* Content Type Filter */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								'h-9 gap-1.5',
								filters.contentType?.length && 'border-primary text-primary',
							)}
						>
							<FunnelIcon className="h-4 w-4" />
							<span className="hidden sm:inline">{t('contentType')}</span>
							{filters.contentType?.length ? (
								<Badge variant="default" className="ml-1 px-1.5 py-0 text-[10px]">
									{filters.contentType.length}
								</Badge>
							) : null}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-52 p-2" align="start">
						<div className="grid gap-1">
							{CONTENT_TYPE_CONFIGS.map((config) => {
								const Icon = config.icon;
								const isSelected = filters.contentType?.includes(config.type) ?? false;
								return (
									<button
										key={config.type}
										onClick={() => handleContentTypeToggle(config.type)}
										className={cn(
											'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
											isSelected && 'bg-accent font-medium',
										)}
									>
										<div
											className={cn(
												'flex h-4 w-4 items-center justify-center rounded border',
												isSelected
													? 'border-primary bg-primary text-primary-foreground'
													: 'border-muted-foreground/30',
											)}
										>
											{isSelected && (
												<svg
													className="h-3 w-3"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
													strokeWidth={3}
												>
													<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											)}
										</div>
										<Icon className="h-4 w-4 text-muted-foreground" />
										<span>{tContent(`tab.${config.label}`)}</span>
									</button>
								);
							})}
						</div>
					</PopoverContent>
				</Popover>

				{/* Tag Filter */}
				{allTags && allTags.length > 0 && (
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className={cn(
									'h-9 gap-1.5',
									filters.tagIds?.length && 'border-primary text-primary',
								)}
							>
								<TagIcon className="h-4 w-4" />
								<span className="hidden sm:inline">{tTags('title')}</span>
								{filters.tagIds?.length ? (
									<Badge variant="default" className="ml-1 px-1.5 py-0 text-[10px]">
										{filters.tagIds.length}
									</Badge>
								) : null}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-52 p-2" align="start">
							<div className="grid gap-1">
								{allTags.map((tag) => {
									const isSelected = filters.tagIds?.includes(tag.id) ?? false;
									return (
										<button
											key={tag.id}
											onClick={() => handleTagToggle(tag.id)}
											className={cn(
												'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
												isSelected && 'bg-accent font-medium',
											)}
										>
											<div
												className={cn(
													'flex h-4 w-4 items-center justify-center rounded border',
													isSelected
														? 'border-primary bg-primary text-primary-foreground'
														: 'border-muted-foreground/30',
												)}
											>
												{isSelected && (
													<svg
														className="h-3 w-3"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														strokeWidth={3}
													>
														<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
													</svg>
												)}
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
						</PopoverContent>
					</Popover>
				)}

				{/* Clear All */}
				{hasActiveFilters && (
					<Button variant="ghost" size="sm" onClick={handleClearAll} className="h-9 gap-1.5">
						<XMarkIcon className="h-4 w-4" />
						<span className="hidden sm:inline">{t('clearAll')}</span>
					</Button>
				)}
			</div>

			{/* Active tag filter badges */}
			{filters.tagIds && filters.tagIds.length > 0 && allTags && (
				<div className="flex flex-wrap gap-1.5">
					{filters.tagIds.map((tagId) => {
						const tag = allTags.find((t) => t.id === tagId);
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

			{/* Active filter badges */}
			{filters.contentType && filters.contentType.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{filters.contentType.map((type) => {
						const config = getContentTypeConfig(type);
						const Icon = config?.icon;
						return (
							<Badge
								key={type}
								variant="secondary"
								className="gap-1 pr-1 cursor-pointer hover:bg-secondary/60"
								onClick={() => handleContentTypeToggle(type)}
							>
								{Icon && <Icon className="h-3 w-3" />}
								{tContent(`tab.${config?.label ?? type}`)}
								<XMarkIcon className="h-3 w-3 ml-0.5" />
							</Badge>
						);
					})}
				</div>
			)}
		</div>
	);
};
