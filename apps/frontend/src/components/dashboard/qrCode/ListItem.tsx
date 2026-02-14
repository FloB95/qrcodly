'use client';

import { PencilIcon } from '@heroicons/react/24/solid';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EyeIcon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import { useGetViewsFromShortCodeQuery } from '@/lib/api/url-shortener';
import { DynamicQrCode } from '@/components/qr-generator/DynamicQrCode';
import { isDynamic, type TQrCodeWithRelationsResponseDto, type TShortUrl } from '@shared/schemas';
import { QrCodeIcon } from './QrCodeIcon';
import { NameDialog } from '@/components/qr-generator/NameDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { RenderContent } from './content-renderers/RenderContent';
import { QrCodeListItemActions } from './QrCodeListItemActions';
import { useQrCodeMutations } from './hooks/useQrCodeMutations';
import { QrCodeTagBadges } from './QrCodeTagBadges';
import { QrCodeTagSelector } from './QrCodeTagSelector';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { QrCodeColumnVisibility } from './hooks/useQrCodeColumnVisibility';

const ViewComponent = ({ shortUrl }: { shortUrl: TShortUrl }) => {
	const t = useTranslations();
	const { data } = useGetViewsFromShortCodeQuery(shortUrl.shortCode);

	if (data?.views === undefined) return null;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="flex items-center gap-1 text-sm">
					<EyeIcon className="size-3.5 text-muted-foreground" />
					<span>{data.views}</span>
				</div>
			</TooltipTrigger>
			<TooltipContent side="top">
				{data.views} {t('analytics.totalViews')}
			</TooltipContent>
		</Tooltip>
	);
};

export const QrCodeListItem = ({
	qr,
	visibility,
}: {
	qr: TQrCodeWithRelationsResponseDto;
	visibility: QrCodeColumnVisibility;
}) => {
	const t = useTranslations();
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);

	const { isDeleting, handleToggle, handleDelete, handleUpdateName } = useQrCodeMutations(qr);

	const isDynamicQr = !!qr.shortUrl && isDynamic(qr.content);
	const hasTags = qr.tags ?? [];

	return (
		<>
			<TableRow
				className={cn(isDeleting && 'opacity-50', qr.shortUrl?.isActive === false && 'opacity-60')}
			>
				{/* QR Code Preview */}
				<TableCell className="w-[72px] py-2 pr-2">
					<HoverCard openDelay={200} closeDelay={100}>
						<HoverCardTrigger asChild>
							<div className="flex items-center gap-2">
								<div className="size-14 shrink-0 overflow-hidden rounded">
									{qr.previewImage ? (
										<Image
											src={qr.previewImage}
											width={56}
											height={56}
											alt="QR code preview"
											className="size-14 object-cover"
											loading="lazy"
										/>
									) : (
										<DynamicQrCode qrCode={qr} additionalStyles="max-h-14 max-w-14" />
									)}
								</div>
							</div>
						</HoverCardTrigger>
						<HoverCardContent side="right" className="w-auto p-2">
							<div className="h-[200px] w-[200px] overflow-hidden rounded">
								{qr.previewImage ? (
									<Image
										src={qr.previewImage}
										width={200}
										height={200}
										alt="QR code preview"
										className="h-[200px] w-[200px] object-cover"
									/>
								) : (
									<DynamicQrCode qrCode={qr} additionalStyles="max-h-[200px] max-w-[200px]" />
								)}
							</div>
						</HoverCardContent>
					</HoverCard>
				</TableCell>

				{/* Name + type icon + dynamic badge + tags */}
				<TableCell className="py-2">
					<div className="flex items-center gap-2 min-w-0">
						<QrCodeIcon type={qr.content.type} />
						<div className="flex flex-col gap-1 min-w-0">
							<div className="flex items-center gap-2 min-w-0">
								<div
									className="group relative min-w-0 cursor-pointer"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setNameDialogOpen(true);
									}}
								>
									<div className="flex items-center gap-2 min-w-0">
										<span className="truncate text-sm font-medium max-w-[200px]">
											{qr.name && qr.name !== '' ? (
												qr.name
											) : (
												<span className="text-muted-foreground">{t('general.noName')}</span>
											)}
										</span>
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
											<span>
												<QrCodeTagSelector qrCodeId={qr.id} currentTagIds={[]} />
											</span>
										</TooltipTrigger>
										<TooltipContent side="top">{t('tags.manageTags')}</TooltipContent>
									</Tooltip>
								)}
							</div>
							{/* Tag chips */}
							{visibility.tags && hasTags.length > 0 && (
								<QrCodeTagBadges qrCodeId={qr.id} tags={hasTags} />
							)}
						</div>
					</div>
				</TableCell>

				{/* Content */}
				{visibility.content && (
					<TableCell className="hidden lg:table-cell py-2 max-w-[250px]">
						<div className="truncate text-sm text-muted-foreground">
							<RenderContent qr={qr} />
						</div>
					</TableCell>
				)}

				{/* Status Badge */}
				{visibility.status && (
					<TableCell className="py-2">
						{qr.shortUrl && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge variant={qr.shortUrl.isActive ? 'default' : 'outline'} className="text-xs">
										{qr.shortUrl.isActive
											? t('analytics.stateActive')
											: t('analytics.stateInactive')}
									</Badge>
								</TooltipTrigger>
								<TooltipContent side="top">
									{qr.shortUrl.isActive
										? t('analytics.activeDescription')
										: t('analytics.inactiveDescription')}
								</TooltipContent>
							</Tooltip>
						)}
					</TableCell>
				)}

				{/* Scans */}
				{visibility.scans && (
					<TableCell className="py-2">
						{qr.shortUrl && <ViewComponent shortUrl={qr.shortUrl} />}
					</TableCell>
				)}

				{/* Created Date */}
				{visibility.created && (
					<TableCell className="hidden md:table-cell py-2 text-sm text-muted-foreground">
						{formatDate(qr.createdAt)}
					</TableCell>
				)}

				{/* Actions */}
				<TableCell className="w-[60px] py-2">
					<QrCodeListItemActions
						qr={qr}
						isDeleting={isDeleting}
						showDeleteConfirm={showDeleteConfirm}
						setShowDeleteConfirm={setShowDeleteConfirm}
						onToggle={handleToggle}
						onDelete={handleDelete}
					/>
				</TableCell>
			</TableRow>

			<NameDialog
				dialogHeadline={t('qrCode.updateQrCodeName.title')}
				placeholder={t('qrCode.updateQrCodeName.placeholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleUpdateName}
				defaultValue={qr.name ?? ''}
			/>
		</>
	);
};

export const SkeletonListItem = ({ visibility }: { visibility: QrCodeColumnVisibility }) => {
	return (
		<TableRow>
			<TableCell className="py-2">
				<Skeleton className="h-10 w-10 rounded" />
			</TableCell>
			<TableCell className="py-2">
				<Skeleton className="h-4 w-32" />
			</TableCell>
			{visibility.content && (
				<TableCell className="hidden lg:table-cell py-2">
					<Skeleton className="h-4 w-40" />
				</TableCell>
			)}
			{visibility.status && (
				<TableCell className="hidden sm:table-cell py-2">
					<Skeleton className="h-5 w-14 rounded-full" />
				</TableCell>
			)}
			{visibility.scans && (
				<TableCell className="hidden sm:table-cell py-2">
					<Skeleton className="h-4 w-8" />
				</TableCell>
			)}
			{visibility.created && (
				<TableCell className="hidden md:table-cell py-2">
					<Skeleton className="h-4 w-20" />
				</TableCell>
			)}
			<TableCell className="py-2">
				<Skeleton className="h-8 w-8 rounded" />
			</TableCell>
		</TableRow>
	);
};
