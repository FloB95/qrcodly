'use client';

import {
	ArrowTurnDownRightIcon,
	CalendarIcon,
	EllipsisVerticalIcon,
	MapPinIcon,
} from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/24/solid';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
} from '../../ui/alert-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { EyeIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useState, memo } from 'react';
import { TableCell, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from '../../ui/use-toast';
import posthog from 'posthog-js';
import { formatDate, getShortUrlFromCode } from '@/lib/utils';
import { useDeleteQrCodeMutation, useUpdateQrCodeMutation } from '@/lib/api/qr-code';
import {
	useGetViewsFromShortCodeQuery,
	useToggleActiveStateMutation,
} from '@/lib/api/url-shortener';
import { DynamicQrCode } from '../../qr-generator/DynamicQrCode';
import QrCodeDownloadBtn from '../../qr-generator/QrCodeDownloadBtn';
import { isDynamic, type TQrCodeWithRelationsResponseDto, type TShortUrl } from '@shared/schemas';
import { QrCodeIcon } from './QrCodeIcon';
import * as Sentry from '@sentry/nextjs';
import { NameDialog } from '../../qr-generator/NameDialog';
import { Skeleton } from '../../ui/skeleton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { DynamicBadge } from '@/components/qr-generator/DynamicBadge';

const RenderContent = memo(({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	switch (qr.content.type) {
		case 'url': {
			const { url, isEditable } = qr.content.data;
			if (isEditable && qr.shortUrl) {
				return (
					<div className="text-muted-foreground">
						<Link
							href={getShortUrlFromCode(qr.shortUrl.shortCode)}
							prefetch={false}
							target="_blank"
							onClick={(e) => e.stopPropagation()}
						>
							{getShortUrlFromCode(qr.shortUrl.shortCode)}
						</Link>
						{qr.shortUrl.destinationUrl && (
							<div className="mt-1 ml-2 flex items-center">
								<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 font-bold" />
								<Link
									onClick={(e) => e.stopPropagation()}
									href={qr.shortUrl.destinationUrl}
									target="_blank"
									className="pt-1 text-sm text-black"
									prefetch={false}
								>
									{qr.shortUrl.destinationUrl}
								</Link>
							</div>
						)}
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
		case 'email':
			return (
				<HoverCard>
					<HoverCardTrigger>{qr.content.data.email}</HoverCardTrigger>
					<HoverCardContent className="w-80 py-15">
						<div className="space-y-2 text-center">
							<h3 className="text-sm font-semibold">{qr.content.data.email}</h3>
							<Separator className="max-w-20 my-4 mx-auto" />
							{qr.content.data.subject && (
								<h4 className="text-sm font-semibold">{qr.content.data.subject}</h4>
							)}
							{qr.content.data.body && <p className="text-sm">{qr.content.data.body}</p>}
						</div>
					</HoverCardContent>
				</HoverCard>
			);
		case 'location':
			return qr.content.data.address;
		case 'event':
			return (
				<HoverCard>
					<HoverCardTrigger>{qr.content.data.title}</HoverCardTrigger>
					<HoverCardContent className="w-80 py-15">
						<div className="space-y-2 text-center">
							<h4 className="text-sm font-semibold">{qr.content.data.title}</h4>
							{qr.content.data.description && (
								<p className="text-sm">{qr.content.data.description}</p>
							)}
							<Separator className="max-w-20 my-4 mx-auto" />
							{qr.content.data.location && (
								<div className="flex items-center justify-center space-x-2 text-sm">
									<MapPinIcon className="w-5 h-5" />
									<span className="max-w-50">{qr.content.data.location}</span>
								</div>
							)}
							<div className="text-sm flex space-x-2 justify-center">
								<CalendarIcon className="w-5 h-5" />
								<span>{formatDate(qr.content.data.startDate)}</span>
							</div>
							<div className="text-sm flex space-x-2 justify-center">
								<CalendarIcon className="w-5 h-5" />
								<span>{formatDate(qr.content.data.endDate)}</span>
							</div>
						</div>
					</HoverCardContent>
				</HoverCard>
			);
		default:
			return 'Unknown';
	}
});

RenderContent.displayName = 'RenderContent';

const ViewComponent = ({ shortUrl }: { shortUrl: TShortUrl }) => {
	const t = useTranslations();
	const { data } = useGetViewsFromShortCodeQuery(shortUrl.shortCode);

	if (data?.views === undefined) return null;

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

export const QrCodeListItem = ({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	const t = useTranslations();
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);

	const deleteMutation = useDeleteQrCodeMutation();
	const toggleMutation = useToggleActiveStateMutation();
	const updateQrCodeMutation = useUpdateQrCodeMutation();

	const handleToggle = useCallback(() => {
		if (!qr.shortUrl) return;
		toggleMutation.mutate(qr.shortUrl.shortCode, {
			onSuccess: () =>
				posthog.capture('short-url-toggled', {
					id: qr.shortUrl!.id,
					isActive: qr.shortUrl?.isActive,
				}),
			onError: (error) => {
				Sentry.captureException(error);
				toast({
					title: t('shortUrl.error.toggleActiveState.title'),
					description: t('shortUrl.error.toggleActiveState.message'),
					variant: 'destructive',
					duration: 5000,
				});
			},
		});
	}, [qr.shortUrl]);

	const handleDelete = useCallback(() => {
		setIsDeleting(true);
		const toastId = toast({
			title: t('qrCode.deleting.title'),
			description: (
				<div className="flex items-center space-x-2">
					<Loader2 className="animate-spin" />
					<span>{t('qrCode.deleting.description')}</span>
				</div>
			),
		});

		deleteMutation.mutate(qr.id, {
			onSuccess: () => {
				toastId.dismiss();
				setIsDeleting(false);
				posthog.capture('qr-code-deleted', { id: qr.id, content: qr.content });
			},
			onError: (error) => {
				Sentry.captureException(error);
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

	const handleUpdate = useCallback(
		(newName: string) => {
			const oldName = qr.name;
			qr.name = newName;
			updateQrCodeMutation.mutate(
				{ qrCodeId: qr.id, data: { name: newName } },
				{
					onSuccess: () => {
						posthog.capture('qr-code-updated', {
							id: qr.id,
							data: {
								name: newName,
							},
						});
					},
					onError: (error) => {
						qr.name = oldName;
						Sentry.captureException(error);
						toast({
							title: t('qrCode.error.update.title'),
							description: t('qrCode.error.update.message'),
							variant: 'destructive',
							duration: 5000,
						});
					},
				},
			);
		},
		[qr.id, qr.name, updateQrCodeMutation],
	);

	const IS_DYNAMIC = !!qr.shortUrl && isDynamic(qr.content);

	return (
		<>
			<TableRow
				className={`rounded-lg shadow ${
					isDeleting ? '!bg-muted/70' : qr.shortUrl?.isActive === false ? '!bg-muted' : 'bg-white'
				}`}
			>
				<TableCell className="rounded-l-lg max-w-42.5">
					<div className="flex space-x-8 max-w-fit">
						<div className="ml-4 hidden sm:flex items-center">
							<QrCodeIcon type={qr.content.type} />
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
								<DynamicQrCode
									qrCode={qr}
									shortUrl={qr.shortUrl as TShortUrl | undefined}
									additionalStyles="max-h-[100px] max-w-[100px]"
								/>
							)}
						</div>
					</div>
				</TableCell>

				{IS_DYNAMIC && (
					<TableCell>
						<DynamicBadge />
					</TableCell>
				)}

				<TableCell colSpan={IS_DYNAMIC ? 1 : 2} className="font-medium max-w-[400px] truncate">
					<div
						className="group relative pr-6 inline-block"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setNameDialogOpen(true);
						}}
					>
						{qr.name && qr.name != '' ? (
							qr.name
						) : (
							<span className="text-muted-foreground">{t('general.noName')}</span>
						)}
						<div className="ml-2 group-hover:block pointer-events-none group-hover:pointer-events-auto hidden">
							<Button size="icon" variant="ghost" className="absolute right-0 top-0 w-4 h-4">
								<PencilIcon className="w-full h-full" />
							</Button>
						</div>
					</div>
				</TableCell>

				<TableCell className="font-medium max-w-[400px] truncate">
					<RenderContent qr={qr} />
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
							<DropdownMenuSeparator />

							{qr.shortUrl && (
								<DropdownMenuItem asChild>
									<Link
										className="cursor-pointer"
										href={`/collection/qr-code/${qr.id}`}
										onClick={(e) => e.stopPropagation()}
									>
										{t('qrCode.actionsMenu.view')}
									</Link>
								</DropdownMenuItem>
							)}

							<DropdownMenuItem asChild>
								<Link
									className="cursor-pointer"
									href={`/collection/qr-code/${qr.id}/edit`}
									onClick={(e) => e.stopPropagation()}
								>
									{t('qrCode.actionsMenu.edit')}
								</Link>
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
							>
								<QrCodeDownloadBtn qrCode={qr} noStyling />
							</DropdownMenuItem>

							{qr.shortUrl && (
								<DropdownMenuItem
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleToggle();
									}}
									className="cursor-pointer"
								>
									{qr.shortUrl.isActive
										? t('qrCode.actionsMenu.disableShortUrl')
										: t('qrCode.actionsMenu.enableShortUrl')}
								</DropdownMenuItem>
							)}

							<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
								<AlertDialogTrigger
									className="cursor-pointer"
									asChild
									onClick={(e) => e.stopPropagation()}
								>
									<DropdownMenuItem
										onSelect={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
									>
										{t('qrCode.actionsMenu.delete')}
									</DropdownMenuItem>
								</AlertDialogTrigger>
								<AlertDialogContent onClick={(e) => e.stopPropagation()}>
									<AlertDialogHeader>
										<AlertDialogTitle>{t('qrCode.confirmDeletePopup.title')}</AlertDialogTitle>
										<AlertDialogDescription>
											{t('qrCode.confirmDeletePopup.description')}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel asChild>
											<Button variant="secondary" onClick={(e) => e.stopPropagation()}>
												{t('qrCode.confirmDeletePopup.cancelBtn')}
											</Button>
										</AlertDialogCancel>
										<Button
											variant="destructive"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
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

			<NameDialog
				dialogHeadline={t('qrCode.updateQrCodeName.title')}
				placeholder={t('qrCode.updateQrCodeName.placeholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleUpdate}
				defaultValue={qr.name ?? ''}
			/>
		</>
	);
};

export const SkeletonListItem = () => {
	return (
		<TableRow className="shadow">
			<TableCell colSpan={6} className="rounded-l-lg p-0">
				<Skeleton className="h-[122px] w-full bg-white/70" />
			</TableCell>
		</TableRow>
	);
};
