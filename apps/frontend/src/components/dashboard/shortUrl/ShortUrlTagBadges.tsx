'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TagIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShortUrlTagSelector } from './ShortUrlTagSelector';
import { useSetShortUrlTagsMutation } from '@/lib/api/tag';
import { useIsTruncated } from '@/hooks/use-is-truncated';
import { toast } from '@/components/ui/use-toast';
import type { TTagResponseDto } from '@shared/schemas';

type TagBadgeProps = {
	tag: TTagResponseDto;
	onRemove: (tagId: string) => void;
};

const TagBadge = ({ tag, onRemove }: TagBadgeProps) => {
	const [ref, isTruncated, checkTruncation] = useIsTruncated<HTMLSpanElement>();

	return (
		<Tooltip open={isTruncated ? undefined : false}>
			<TooltipTrigger asChild>
				<Badge
					onMouseEnter={checkTruncation}
					className="group/tag shrink-0 gap-1 text-[10px] px-1.5 py-0 h-5 border-0 max-w-[140px]"
					style={{
						backgroundColor: tag.color,
						color: '#fff',
					}}
				>
					<TagIcon className="size-3 shrink-0" />
					<span ref={ref} className="truncate">
						{tag.name}
					</span>
					<button
						className="hidden group-hover/tag:flex items-center shrink-0 -mr-0.5 rounded-full hover:bg-white/25 cursor-pointer"
						onClick={async (e) => {
							e.preventDefault();
							e.stopPropagation();
							onRemove(tag.id);
						}}
					>
						<XMarkIcon className="size-3" />
					</button>
				</Badge>
			</TooltipTrigger>
			<TooltipContent side="top">{tag.name}</TooltipContent>
		</Tooltip>
	);
};

type ShortUrlTagBadgesProps = {
	shortUrlId: string;
	tags: TTagResponseDto[];
};

export const ShortUrlTagBadges = ({ shortUrlId, tags: initialTags }: ShortUrlTagBadgesProps) => {
	const t = useTranslations('tags');
	const [tags, setTags] = useState<TTagResponseDto[]>(initialTags);
	const setTagsMutation = useSetShortUrlTagsMutation();

	const handleRemove = async (tagId: string) => {
		if (setTagsMutation.isPending) return;
		const updatedTagIds = tags.filter((t) => t.id !== tagId).map((t) => t.id);
		try {
			const updatedTags = await setTagsMutation.mutateAsync({
				shortUrlId,
				tagIds: updatedTagIds,
			});
			setTags(updatedTags);
		} catch {
			toast({ title: t('toast.assignErrorTitle'), variant: 'destructive' });
		}
	};

	return (
		<div className="flex flex-wrap items-center gap-1">
			{tags.map((tag) => (
				<TagBadge key={tag.id} tag={tag} onRemove={handleRemove} />
			))}
			<ShortUrlTagSelector
				shortUrlId={shortUrlId}
				currentTagIds={tags.map((t) => t.id)}
				onTagsUpdated={setTags}
			/>
		</div>
	);
};
