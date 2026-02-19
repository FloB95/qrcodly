'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	MagnifyingGlassIcon,
	XMarkIcon,
	FunnelIcon,
	EllipsisVerticalIcon,
	ArrowUpTrayIcon,
	ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { useTranslations } from 'next-intl';
import {
	BULK_ENABLED_CONTENT_TYPES,
	CONTENT_TYPE_CONFIGS,
	getContentTypeConfig,
} from '@/lib/content-type.config';
import type { TQrCodeContentType } from '@shared/schemas';
import type { QrCodeFilters as QrCodeFiltersType } from '@/lib/api/qr-code';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useListTagsQuery } from '@/lib/api/tag';
import { TagIcon } from '@heroicons/react/24/outline';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';
import {
	QR_CODE_COLUMNS,
	type QrCodeColumn,
	type QrCodeColumnVisibility,
} from './hooks/useQrCodeColumnVisibility';
import posthog from 'posthog-js';

type QrCodeFiltersProps = {
	filters: QrCodeFiltersType;
	onFiltersChange: (filters: QrCodeFiltersType) => void;
	columnVisibility: QrCodeColumnVisibility;
	onToggleColumn: (column: QrCodeColumn) => void;
	onBulkImport?: (contentType: TQrCodeContentType) => void;
	onBulkExport?: () => void;
	className?: string;
};

export const QrCodeFilters = ({
	filters,
	onFiltersChange,
	columnVisibility,
	onToggleColumn,
	onBulkImport,
	onBulkExport,
	className,
}: QrCodeFiltersProps) => {
	const t = useTranslations('collection.filters');
	const tCollection = useTranslations('collection');
	const tContent = useTranslations('generator.contentSwitch');
	const tTags = useTranslations('tags');
	const tTable = useTranslations('qrCode.table');
	const [searchValue, setSearchValue] = useState(filters.search ?? '');
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const filtersRef = useRef(filters);
	const onFiltersChangeRef = useRef(onFiltersChange);
	const [tagSearch, setTagSearch] = useState('');
	const [debouncedTagSearch] = useDebouncedValue(tagSearch, 300);
	const { data: tagsData } = useListTagsQuery(1, 50, debouncedTagSearch || undefined);
	const allTags = tagsData?.data;
	const selectedTagsCacheRef = useRef<Map<string, { id: string; name: string; color: string }>>(
		new Map(),
	);

	// Keep cache of selected tags so badges persist during tag search
	useEffect(() => {
		if (allTags) {
			for (const tag of allTags) {
				selectedTagsCacheRef.current.set(tag.id, { id: tag.id, name: tag.name, color: tag.color });
			}
		}
	}, [allTags]);

	useEffect(() => {
		filtersRef.current = filters;
	}, [filters]);
	useEffect(() => {
		onFiltersChangeRef.current = onFiltersChange;
	}, [onFiltersChange]);

	// Sync local searchValue when filters.search changes externally (e.g., URL-driven reset)
	useEffect(() => {
		const externalSearch = filters.search ?? '';
		if (externalSearch !== searchValue.trim()) {
			setSearchValue(externalSearch);
		}
		// Only react to external filter changes, not local searchValue edits
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters.search]);

	// Debounce search input
	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			const trimmed = searchValue.trim();
			if (trimmed !== (filtersRef.current.search ?? '')) {
				onFiltersChangeRef.current({ ...filtersRef.current, search: trimmed || undefined });
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
			const isAdding = !current.includes(type);
			const updated = isAdding ? [...current, type] : current.filter((t) => t !== type);
			posthog.capture('qr-list:filter-content-type-toggled', { type, active: isAdding });
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
			const isAdding = !current.includes(tagId);
			const updated = isAdding ? [...current, tagId] : current.filter((id) => id !== tagId);
			posthog.capture('qr-list:filter-tag-toggled', { tagId, active: isAdding });
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

	const hasActions = !!(onBulkImport && onBulkExport);

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			<div className="flex flex-wrap items-center gap-2">
				{/* Search Input */}
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
							<span className="hidden lg:inline">{t('contentType')}</span>
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
											{isSelected && <CheckIcon className="h-3 w-3" />}
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
								<Badge variant="default" className="ml-1 px-1.5 py-0 text-[10px]">
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

				{/* Actions */}
				{hasActions && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="ml-auto h-9 gap-1.5">
								<EllipsisVerticalIcon className="size-5" />
								<span className="hidden lg:inline">{t('actions')}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>{tCollection('importExportLabel')}</DropdownMenuLabel>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger className="gap-2">
									<ArrowUpTrayIcon className="size-4" />
									{tContent('bulkModeBtn')}
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuLabel>{tCollection('bulkImportLabel')}</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{BULK_ENABLED_CONTENT_TYPES.map((contentType) => {
										const config = getContentTypeConfig(contentType);
										const Icon = config?.icon;
										return (
											<DropdownMenuItem
												key={contentType}
												onClick={() => onBulkImport(contentType)}
												className="cursor-pointer"
											>
												{Icon && <Icon className="mr-2 h-4 w-4" />}
												{tContent(`tab.${config?.label || contentType}`)}
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							<DropdownMenuItem onClick={onBulkExport} className="cursor-pointer gap-2">
								<ArrowDownTrayIcon className="h-4 w-4" />
								{tCollection('exportBtn')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				{/* Column Visibility */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn('h-9 gap-1.5', !hasActions && 'ml-auto')}
						>
							<Settings2 className="h-4 w-4" />
							<span className="hidden sm:inline">{t('columns')}</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-48">
						<DropdownMenuLabel>{t('toggleColumns')}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{QR_CODE_COLUMNS.map((column) => (
							<DropdownMenuCheckboxItem
								key={column}
								checked={columnVisibility[column]}
								onCheckedChange={() => onToggleColumn(column)}
							>
								{tTable(column === 'tags' ? 'tags' : column)}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
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
