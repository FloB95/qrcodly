'use client';

import { TagIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { QrCodeTagSelector } from './QrCodeTagSelector';
import { useSetQrCodeTagsMutation } from '@/lib/api/tag';
import { toast } from '@/components/ui/use-toast';
import type { TTagResponseDto } from '@shared/schemas';

type QrCodeTagBadgesProps = {
	qrCodeId: string;
	tags: TTagResponseDto[];
};

export const QrCodeTagBadges = ({ qrCodeId, tags }: QrCodeTagBadgesProps) => {
	const setTagsMutation = useSetQrCodeTagsMutation();

	return (
		<div className="flex flex-wrap items-center gap-1">
			{tags.map((tag) => (
				<Tooltip key={tag.id}>
					<TooltipTrigger asChild>
						<Badge
							className="group/tag gap-1 text-[10px] px-1.5 py-0 h-5 border-0 max-w-[140px]"
							style={{
								backgroundColor: tag.color,
								color: '#fff',
							}}
						>
							<TagIcon className="size-3 shrink-0" />
							<span className="truncate">{tag.name}</span>
							<button
								className="hidden group-hover/tag:flex items-center shrink-0 -mr-0.5 rounded-full hover:bg-white/25 cursor-pointer"
								onClick={async (e) => {
									e.preventDefault();
									e.stopPropagation();
									const updatedTagIds = tags.filter((t) => t.id !== tag.id).map((t) => t.id);
									try {
										await setTagsMutation.mutateAsync({
											qrCodeId,
											tagIds: updatedTagIds,
										});
									} catch {
										toast.error('Failed to remove tag');
									}
								}}
							>
								<XMarkIcon className="size-3" />
							</button>
						</Badge>
					</TooltipTrigger>
					<TooltipContent side="top">{tag.name}</TooltipContent>
				</Tooltip>
			))}
			<QrCodeTagSelector qrCodeId={qrCodeId} currentTagIds={tags.map((t) => t.id)} />
		</div>
	);
};
