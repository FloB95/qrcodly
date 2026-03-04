import { PencilIcon } from '@heroicons/react/24/solid';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useIsTruncated } from '@/hooks/use-is-truncated';
import { QrCodeIcon } from './QrCodeIcon';
import { QrCodeTagBadges } from './QrCodeTagBadges';
import { QrCodeTagSelector } from './QrCodeTagSelector';
import type { QrCodeColumnVisibility } from './hooks/useQrCodeColumnVisibility';

const stopContextMenu = (e: React.MouseEvent) => e.stopPropagation();

type QrCodeNameCellProps = {
	qr: TQrCodeWithRelationsResponseDto;
	isDynamicQr: boolean;
	visibility: QrCodeColumnVisibility;
	onEditName: () => void;
};

export const QrCodeNameCell = ({
	qr,
	isDynamicQr,
	visibility,
	onEditName,
}: QrCodeNameCellProps) => {
	const t = useTranslations();
	const hasTags = qr.tags ?? [];
	const [nameRef, isNameTruncated, checkNameTruncation] = useIsTruncated<HTMLSpanElement>();

	return (
		<TableCell className="py-2 max-w-[280px]">
			<div className="flex items-center gap-2 min-w-0">
				<QrCodeIcon type={qr.content.type} />
				<div className="flex flex-col gap-1 min-w-0">
					<div className="flex items-center gap-2 min-w-0">
						<div
							className="group relative min-w-0 cursor-pointer"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onEditName();
							}}
							onContextMenu={stopContextMenu}
						>
							<div className="flex items-center gap-2 min-w-0">
								<Tooltip open={isNameTruncated ? undefined : false}>
									<TooltipTrigger asChild>
										<span
											ref={nameRef}
											onMouseEnter={checkNameTruncation}
											className="truncate text-sm font-medium max-w-[200px]"
										>
											{qr.name && qr.name !== '' ? (
												qr.name
											) : (
												<span className="text-muted-foreground">{t('general.noName')}</span>
											)}
										</span>
									</TooltipTrigger>
									<TooltipContent side="top">{qr.name}</TooltipContent>
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
						{isDynamicQr && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge
										variant="outline"
										className="shrink-0 border-teal-600 text-teal-700 text-[10px] px-1.5 py-0"
									>
										Dynamic
									</Badge>
								</TooltipTrigger>
								<TooltipContent side="top">{t('general.dynamicDescription')}</TooltipContent>
							</Tooltip>
						)}
						{visibility.tags && hasTags.length === 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span onContextMenu={stopContextMenu}>
										<QrCodeTagSelector qrCodeId={qr.id} currentTagIds={[]} />
									</span>
								</TooltipTrigger>
								<TooltipContent side="top">{t('tags.manageTags')}</TooltipContent>
							</Tooltip>
						)}
					</div>
					{/* Tag chips */}
					{visibility.tags && hasTags.length > 0 && (
						<div onContextMenu={stopContextMenu}>
							<QrCodeTagBadges qrCodeId={qr.id} tags={hasTags} />
						</div>
					)}
				</div>
			</div>
		</TableCell>
	);
};
