'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useAllTagsQuery, useSetQrCodeTagsMutation } from '@/lib/api/tag';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TTagResponseDto } from '@shared/schemas';

type QrCodeTagSelectorProps = {
	qrCodeId: string;
	currentTagIds: string[];
	trigger?: React.ReactNode;
};

export const QrCodeTagSelector = ({ qrCodeId, currentTagIds, trigger }: QrCodeTagSelectorProps) => {
	const t = useTranslations('tags');
	const { data: allTags } = useAllTagsQuery();
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
				setOpen(true);
				return;
			}

			setOpen(false);

			const changed =
				localTagIds.length !== initialTagIdsRef.current.length ||
				localTagIds.some((id) => !initialTagIdsRef.current.includes(id));

			if (!changed) return;

			try {
				await setTagsMutation.mutateAsync({ qrCodeId, tagIds: localTagIds });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Failed to update tags';
				toast.error(message);
			}
		},
		[currentTagIds, localTagIds, qrCodeId, setTagsMutation],
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
				{!allTags || allTags.length === 0 ? (
					<div className="text-sm text-muted-foreground px-2 py-2">{t('noTags')}</div>
				) : (
					<div className="grid gap-1">
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
	);
};
