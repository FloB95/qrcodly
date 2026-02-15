'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { TagIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { useTranslations } from 'next-intl';
import { useListTagsQuery, useSetQrCodeTagsMutation } from '@/lib/api/tag';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { TTagResponseDto } from '@shared/schemas';
import type { ApiError } from '@/lib/api/ApiError';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

type QrCodeTagSelectorProps = {
	qrCodeId: string;
	currentTagIds: string[];
	trigger?: React.ReactNode;
	onTagsUpdated?: (tags: TTagResponseDto[]) => void;
};

export const QrCodeTagSelector = ({
	qrCodeId,
	currentTagIds,
	trigger,
	onTagsUpdated,
}: QrCodeTagSelectorProps) => {
	const t = useTranslations('tags');
	const [search, setSearch] = useState('');
	const [debouncedSearch] = useDebouncedValue(search, 300);
	const { data: tagsData } = useListTagsQuery(1, 50, debouncedSearch || undefined);
	const allTags = tagsData?.data;
	const setTagsMutation = useSetQrCodeTagsMutation();
	const [open, setOpen] = useState(false);
	const [localTagIds, setLocalTagIds] = useState<string[]>(currentTagIds);
	const initialTagIdsRef = useRef<string[]>(currentTagIds);

	const handleToggle = (tagId: string) => {
		setLocalTagIds((prev) =>
			prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
		);
	};

	const handleOpenChange = useCallback(
		async (nextOpen: boolean) => {
			if (nextOpen) {
				setLocalTagIds(currentTagIds);
				initialTagIdsRef.current = currentTagIds;
				setSearch('');
				setOpen(true);
				return;
			}

			setOpen(false);

			const changed =
				localTagIds.length !== initialTagIdsRef.current.length ||
				localTagIds.some((id) => !initialTagIdsRef.current.includes(id));

			if (!changed) return;

			try {
				const updatedTags = await setTagsMutation.mutateAsync({ qrCodeId, tagIds: localTagIds });
				onTagsUpdated?.(updatedTags);
				posthog.capture('qr-code-tags-updated', { qrCodeId, tagIds: localTagIds });
				toast({
					title: t('toast.tagsUpdatedTitle'),
					description: t('toast.tagsUpdatedDescription'),
					duration: 5000,
				});
			} catch (e: unknown) {
				const error = e as ApiError;

				if (error.code >= 500) {
					Sentry.captureException(error, { extra: { qrCodeId, tagIds: localTagIds } });
				}

				posthog.capture('error:qr-code-tags-updated', {
					qrCodeId,
					error: { code: error.code, message: error.message },
				});

				toast({
					variant: 'destructive',
					title: t('toast.assignErrorTitle'),
					description: error.message,
					duration: 5000,
				});
			}
		},
		[currentTagIds, localTagIds, qrCodeId, setTagsMutation, onTagsUpdated],
	);

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				{trigger ?? (
					<Button variant="ghost" size="icon" className="h-6 w-6">
						<TagIcon className="size-3.5" />
					</Button>
				)}
			</PopoverTrigger>
			<PopoverContent className="w-72 p-2" align="start">
				<div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
					{t('manageTags')}
				</div>
				<div className="relative mb-2">
					<MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						type="text"
						placeholder={t('searchTags')}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-8 h-8 text-xs"
					/>
				</div>
				{!allTags || allTags.length === 0 ? (
					<div className="text-sm text-muted-foreground px-2 py-2">{t('noTags')}</div>
				) : (
					<div className="grid gap-1 max-h-52 overflow-y-auto">
						{allTags.map((tag: TTagResponseDto) => {
							const isSelected = localTagIds.includes(tag.id);
							return (
								<button
									key={tag.id}
									onClick={() => handleToggle(tag.id)}
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
	);
};
