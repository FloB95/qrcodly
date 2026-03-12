import { PencilIcon } from '@heroicons/react/24/solid';
import { LinkIcon } from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { useIsTruncated } from '@/hooks/use-is-truncated';
import { ShortUrlTagBadges } from './ShortUrlTagBadges';
import { ShortUrlTagSelector } from './ShortUrlTagSelector';

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

type ShortUrlNameCellProps = {
	shortUrl: TShortUrlWithCustomDomainResponseDto;
	onEditName: () => void;
};

export const ShortUrlNameCell = ({ shortUrl, onEditName }: ShortUrlNameCellProps) => {
	const t = useTranslations();
	const tags = shortUrl.tags ?? [];
	const [nameRef, isNameTruncated, checkNameTruncation] = useIsTruncated<HTMLSpanElement>();

	return (
		<TableCell className="py-2 max-w-[280px]">
			<div className="flex items-center gap-2 min-w-0">
				<LinkIcon className="size-4 shrink-0 text-muted-foreground" />
				<div className="flex flex-col gap-1 min-w-0">
					<div className="flex items-center gap-2 min-w-0">
						<div
							className="group relative min-w-0 cursor-pointer"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onEditName();
							}}
						>
							<div className="flex items-center gap-2 min-w-0">
								<Tooltip open={isNameTruncated ? undefined : false}>
									<TooltipTrigger asChild>
										<span
											ref={nameRef}
											onMouseEnter={checkNameTruncation}
											className="truncate text-sm font-medium max-w-[200px]"
										>
											{shortUrl.name && shortUrl.name !== '' ? (
												shortUrl.name
											) : (
												<span className="text-muted-foreground">{t('general.noName')}</span>
											)}
										</span>
									</TooltipTrigger>
									<TooltipContent side="top">{shortUrl.name}</TooltipContent>
								</Tooltip>
								<Button
									size="icon"
									variant="ghost"
									className="hidden group-hover:inline-flex h-5 w-5 shrink-0"
								>
									<PencilIcon className="size-3" />
								</Button>
							</div>
						</div>
						{tags.length === 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span onClick={stopPropagation}>
										<ShortUrlTagSelector shortUrlId={shortUrl.id} currentTagIds={[]} />
									</span>
								</TooltipTrigger>
								<TooltipContent side="top">{t('tags.manageTags')}</TooltipContent>
							</Tooltip>
						)}
					</div>
					{tags.length > 0 && (
						<div onClick={stopPropagation}>
							<ShortUrlTagBadges shortUrlId={shortUrl.id} tags={tags} />
						</div>
					)}
				</div>
			</div>
		</TableCell>
	);
};
