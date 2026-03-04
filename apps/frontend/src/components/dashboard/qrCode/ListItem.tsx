'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EyeIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn, formatDate } from '@/lib/utils';
import { useGetViewsFromShortCodeQuery } from '@/lib/api/url-shortener';
import { isDynamic, type TQrCodeWithRelationsResponseDto, type TShortUrl } from '@shared/schemas';
import { Skeleton } from '@/components/ui/skeleton';
import { RenderContent } from './content-renderers/RenderContent';
import { QrCodeListItemActions } from './QrCodeListItemActions';
import { useQrCodeMutations } from './hooks/useQrCodeMutations';
import { useQrCodeActionHandlers } from './hooks/useQrCodeActionHandlers';
import type { QrCodeColumnVisibility } from './hooks/useQrCodeColumnVisibility';
import { QrCodeMenuItems, type MenuComponents } from './QrCodeMenuItems';
import { QrCodePreviewCell } from './QrCodePreviewCell';
import { QrCodeNameCell } from './QrCodeNameCell';
import { QrCodeDialogs } from './QrCodeDialogs';

const contextMenuComponents: MenuComponents = {
	Item: ContextMenuItem,
	Label: ContextMenuLabel,
	Separator: ContextMenuSeparator,
	Sub: ContextMenuSub,
	SubTrigger: ContextMenuSubTrigger,
	SubContent: ContextMenuSubContent,
};

const stopContextMenu = (e: React.MouseEvent) => e.stopPropagation();

const ViewComponent = ({ shortUrl, qrCodeId }: { shortUrl: TShortUrl; qrCodeId: string }) => {
	const t = useTranslations();
	const { data, isLoading } = useGetViewsFromShortCodeQuery(shortUrl.shortCode);

	if (isLoading) {
		return (
			<div className="flex items-center gap-1 text-sm">
				<EyeIcon className="size-3.5 text-muted-foreground" />
				<Loader2 className="size-3.5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (data?.views === undefined) return null;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="flex items-center gap-1 text-sm">
					<EyeIcon className="size-3.5 text-muted-foreground" />
					<span>{data.views}</span>
				</div>
			</TooltipTrigger>
			<TooltipContent side="top" className="flex flex-col items-center gap-1">
				<span>
					{data.views} {t('analytics.scansUnit')}
				</span>
				<Link
					href={`/dashboard/qr-codes/${qrCodeId}`}
					className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
				>
					{t('analytics.viewDetailedAnalytics')}
				</Link>
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

	const {
		templateNameDialogOpen,
		setTemplateNameDialogOpen,
		shareDialogOpen,
		setShareDialogOpen,
		handleQrCodeDownload,
		handleContentFileDownload,
		handleCreateTemplate,
		showContentFileDownload,
		contentFileLabel,
		isConfigDefault,
	} = useQrCodeActionHandlers(qr);

	const isDynamicQr = !!qr.shortUrl && isDynamic(qr.content);

	const menuItemProps = {
		qr,
		onShare: () => setShareDialogOpen(true),
		onDownloadQrCode: handleQrCodeDownload,
		onDownloadContentFile: handleContentFileDownload,
		onToggle: handleToggle,
		onSaveAsTemplate: () => setTemplateNameDialogOpen(true),
		onDelete: () => setShowDeleteConfirm(true),
		showContentFileDownload,
		contentFileLabel,
		isConfigDefault,
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild disabled={isDeleting}>
				<TableRow
					className={cn(
						isDeleting && 'opacity-50',
						qr.shortUrl?.isActive === false && 'opacity-60',
					)}
				>
					<QrCodePreviewCell qr={qr} />

					<QrCodeNameCell
						qr={qr}
						isDynamicQr={isDynamicQr}
						visibility={visibility}
						onEditName={() => setNameDialogOpen(true)}
					/>

					{/* Content */}
					{visibility.content && (
						<TableCell className="hidden lg:table-cell py-2 max-w-[250px]">
							<div className="truncate text-sm text-foreground">
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
										<Badge
											variant={qr.shortUrl.isActive ? 'default' : 'outline'}
											className="text-xs"
										>
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
							{qr.shortUrl && <ViewComponent shortUrl={qr.shortUrl} qrCodeId={qr.id} />}
						</TableCell>
					)}

					{/* Created Date */}
					{visibility.created && (
						<TableCell className="hidden md:table-cell py-2 text-sm text-muted-foreground">
							{formatDate(qr.createdAt)}
						</TableCell>
					)}

					{/* Actions */}
					<TableCell className="w-[60px] py-2" onContextMenu={stopContextMenu}>
						<QrCodeListItemActions isDeleting={isDeleting} {...menuItemProps} />
					</TableCell>
				</TableRow>
			</ContextMenuTrigger>

			<ContextMenuContent>
				<QrCodeMenuItems components={contextMenuComponents} {...menuItemProps} />
			</ContextMenuContent>

			<QrCodeDialogs
				qrCodeId={qr.id}
				qrCodeName={qr.name}
				nameDialogOpen={nameDialogOpen}
				setNameDialogOpen={setNameDialogOpen}
				onUpdateName={handleUpdateName}
				showDeleteConfirm={showDeleteConfirm}
				setShowDeleteConfirm={setShowDeleteConfirm}
				onDelete={handleDelete}
				templateNameDialogOpen={templateNameDialogOpen}
				setTemplateNameDialogOpen={setTemplateNameDialogOpen}
				onCreateTemplate={handleCreateTemplate}
				shareDialogOpen={shareDialogOpen}
				setShareDialogOpen={setShareDialogOpen}
			/>
		</ContextMenu>
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
