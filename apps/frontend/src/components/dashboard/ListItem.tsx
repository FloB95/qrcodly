'use client';

import {
	ArrowTurnDownRightIcon,
	DocumentTextIcon,
	EllipsisVerticalIcon,
	IdentificationIcon,
	LinkIcon,
	WifiIcon,
} from '@heroicons/react/24/outline';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
} from '../ui/alert-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { EyeIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useState, memo } from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from '../ui/use-toast';
import posthog from 'posthog-js';
import { formatDate } from '@/lib/utils';
import { useDeleteQrCodeMutation } from '@/lib/api/qr-code';
import {
	useGetViewsFromShortCodeQuery,
	useToggleActiveStateMutation,
} from '@/lib/api/url-shortener';
import { DynamicQrCode } from '../qr-generator/DynamicQrCode';
import QrCodeDownloadBtn from '../qr-generator/QrCodeDownloadBtn';
import type { TQrCodeWithRelationsResponseDto, TQrCode, TShortUrl } from '@shared/schemas';

const NameByContent = memo(({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	switch (qr.content.type) {
		case 'url': {
			const { url, isEditable } = qr.content.data;
			if (isEditable && qr.shortUrl) {
				return (
					<div className="text-muted-foreground">
						{url}
						<div className="mt-1 ml-2 flex items-center">
							<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 font-bold" />
							<span className="pt-1 text-sm text-black">{qr.shortUrl.destinationUrl}</span>
						</div>
					</div>
				);
			}
			return url;
		}
		case 'text':
			return qr.content.data;
		case 'wifi':
			return qr.content.data?.ssid;
		case 'vCard':
			const { firstName = '', lastName = '' } = qr.content.data;
			return `${firstName} ${lastName}`;
		default:
			return 'Unknown';
	}
});

NameByContent.displayName = 'NameByContent';

const QrIcon = memo(({ type }: { type: TQrCode['content']['type'] }) => {
	const icons = {
		url: LinkIcon,
		text: DocumentTextIcon,
		wifi: WifiIcon,
		vCard: IdentificationIcon,
	};
	const Icon = icons[type] ?? (() => <>❓</>);
	return <Icon className="mr-2 h-6 w-6" />;
});

QrIcon.displayName = 'QrIcon';

const ViewComponent = ({ shortUrl }: { shortUrl: TShortUrl }) => {
	const t = useTranslations();
	const { data } = useGetViewsFromShortCodeQuery(shortUrl.shortCode);

	if (!data?.views) return null;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="flex items-center space-x-2">
					<span>{data.views}</span>
					<EyeIcon width={20} height={20} />
				</div>
			</TooltipTrigger>
			<TooltipContent side="top">
				{data.views} {t('analytics.totalViews')}
			</TooltipContent>
		</Tooltip>
	);
};

export const DashboardListItem = ({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	const t = useTranslations();
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const deleteMutation = useDeleteQrCodeMutation();
	const toggleMutation = useToggleActiveStateMutation();

	const handleToggle = useCallback(() => {
		if (!qr.shortUrl) return;
		toggleMutation.mutate(qr.shortUrl.shortCode, {
			onSuccess: () =>
				posthog.capture('short-url-toggled', {
					id: qr.shortUrl!.id,
					isActive: qr.shortUrl?.isActive,
				}),
			onError: () =>
				toast({
					title: t('shortUrl.error.toggleActiveState.title'),
					description: t('shortUrl.error.toggleActiveState.message'),
					variant: 'destructive',
					duration: 5000,
				}),
		});
	}, [qr.shortUrl]);

	const handleDelete = useCallback(() => {
		setIsDeleting(true);
		const toastId = toast({
			title: 'Deleting QR code...',
			description: (
				<div className="flex items-center space-x-2">
					<Loader2 className="animate-spin" />
					<span>We are deleting your QR code</span>
				</div>
			),
		});

		deleteMutation.mutate(qr.id, {
			onSuccess: () => {
				toastId.dismiss();
				setIsDeleting(false);
				posthog.capture('qr-code-deleted', { id: qr.id, content: qr.content });
			},
			onError: () => {
				toastId.dismiss();
				setIsDeleting(false);
				toast({
					title: t('qrCode.error.delete.title'),
					description: t('qrCode.error.delete.message'),
					variant: 'destructive',
				});
			},
		});
	}, [qr]);

	return (
		<TableRow
			className={`rounded-lg shadow ${
				isDeleting ? '!bg-muted/70' : qr.shortUrl?.isActive === false ? '!bg-muted' : 'bg-white'
			}`}
		>
			<TableCell className="rounded-l-lg">
				<div className="flex space-x-8">
					<div className="ml-4 hidden sm:flex items-center">
						<QrIcon type={qr.content.type} />
					</div>
					<div className="h-[90px] w-[90px] overflow-hidden">
						{qr.previewImage ? (
							<Image
								src={qr.previewImage}
								width={180}
								height={180}
								alt="QR code preview"
								loading="lazy"
							/>
						) : (
							<DynamicQrCode qrCode={qr} additionalStyles="max-h-[100px] max-w-[100px]" />
						)}
					</div>
				</div>
			</TableCell>

			<TableCell className="font-medium max-w-[400px] truncate">
				<NameByContent qr={qr} />
			</TableCell>

			<TableCell className="hidden sm:table-cell">
				{qr.shortUrl && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge variant={qr.shortUrl.isActive ? 'default' : 'outline'}>
								{qr.shortUrl.isActive ? t('analytics.stateActive') : t('analytics.stateInactive')}
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

			<TableCell>{qr.shortUrl && <ViewComponent shortUrl={qr.shortUrl} />}</TableCell>
			<TableCell className="hidden md:table-cell">{formatDate(qr.createdAt)}</TableCell>

			<TableCell className="rounded-r-lg">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="icon" variant="ghost" disabled={isDeleting}>
							<EllipsisVerticalIcon width={28} height={28} />
							<span className="sr-only">Toggle menu</span>
						</Button>
					</DropdownMenuTrigger>

					<DropdownMenuContent align="end">
						<DropdownMenuLabel>{t('qrCode.actionsMenu.title')}</DropdownMenuLabel>

						<DropdownMenuItem asChild>
							<Link className="cursor-pointer" href={`/collection/qr-code/${qr.id}`}>
								{t('qrCode.actionsMenu.view')}
							</Link>
						</DropdownMenuItem>

						<DropdownMenuItem>
							<QrCodeDownloadBtn qrCode={qr} noStyling />
						</DropdownMenuItem>

						{qr.shortUrl && (
							<DropdownMenuItem onClick={handleToggle}>
								{qr.shortUrl.isActive
									? t('qrCode.actionsMenu.disableShortUrl')
									: t('qrCode.actionsMenu.enableShortUrl')}
							</DropdownMenuItem>
						)}

						<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
							<AlertDialogTrigger className="cursor-pointer" asChild>
								<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
									{t('qrCode.actionsMenu.delete')}
								</DropdownMenuItem>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t('qrCode.confirmDeletePopup.title')}</AlertDialogTitle>
									<AlertDialogDescription>
										{t('qrCode.confirmDeletePopup.description')}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel asChild>
										<Button variant="secondary">{t('qrCode.confirmDeletePopup.cancelBtn')}</Button>
									</AlertDialogCancel>
									<Button
										variant="destructive"
										onClick={() => {
											handleDelete();
											setShowDeleteConfirm(false);
										}}
									>
										{t('qrCode.confirmDeletePopup.confirmBtn')}
									</Button>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
};
