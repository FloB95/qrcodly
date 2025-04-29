'use client';

import QrCodeDownloadBtn from '../qr-generator/QrCodeDownloadBtn';
import { useCallback, useState } from 'react';
import { toast } from '../ui/use-toast';
import { Button } from '../ui/button';
import { DynamicQrCode } from '../qr-generator/DynamicQrCode';
import {
	ArrowTurnDownRightIcon,
	DocumentTextIcon,
	EllipsisVerticalIcon,
	IdentificationIcon,
	LinkIcon,
	WifiIcon,
} from '@heroicons/react/24/outline';
import { TableCell, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { EyeIcon, Loader2 } from 'lucide-react';
import type { TQrCode, TQrCodeWithRelationsResponseDto, TShortUrl } from '@shared/schemas';
import { useDeleteQrCodeMutation } from '@/lib/api/qr-code';
import posthog from 'posthog-js';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useGetViewsFromShortCodeQuery } from '@/lib/api/url-shortener';
import { useTranslations } from 'next-intl';

const GetNameByContentType = (qr: TQrCodeWithRelationsResponseDto) => {
	switch (qr.content.type) {
		case 'url':
			const { url, isEditable } = qr.content.data;
			return (
				<>
					{isEditable && qr?.shortUrl ? (
						<div className="text-muted-foreground">
							{url}
							<div className="mt-1 ml-2 flex items-center opacity-100 transition-opacity duration-300 ease-in-out">
								<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 font-bold" />
								<span className="pt-1 text-sm text-black">{qr.shortUrl.destinationUrl}</span>
							</div>
						</div>
					) : (
						url
					)}
				</>
			);
		case 'text':
			return qr.content.data;
		case 'wifi':
			const wifiData = qr.content.data;
			return wifiData?.ssid;
		case 'vCard':
			const vCardData = qr.content.data;
			return `${vCardData?.firstName ?? ''} ${vCardData?.lastName ?? ''}`;
		default:
			return 'Unknown';
	}
};

const GetQrCodeIconByContentType = (qr: TQrCode) => {
	switch (qr.content.type) {
		case 'url':
			return <LinkIcon className="mr-2 h-6 w-6" />;
		case 'text':
			return <DocumentTextIcon className="mr-2 h-6 w-6" />;
		case 'wifi':
			return <WifiIcon className="mr-2 h-6 w-6" />;
		case 'vCard':
			return <IdentificationIcon className="mr-2 h-6 w-6" />;
		default:
			return '❓';
	}
};

export const ViewComponent = ({ shortUrl }: { shortUrl: TShortUrl }) => {
	const t = useTranslations();
	const { data } = useGetViewsFromShortCodeQuery(shortUrl.shortCode);
	if (data?.views) {
		return (
			<div>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex space-x-2">
							<span>{data.views}</span> <EyeIcon width={20} height={20} />
						</div>
					</TooltipTrigger>
					<TooltipContent side="top">
						{data.views} {t('analytics.totalViews')}
					</TooltipContent>
				</Tooltip>
			</div>
		);
	}

	return <></>;
};

export const DashboardListItem = ({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	const trans = useTranslations();
	const [isDeleting, setIsDeleting] = useState<boolean>(false);
	const deleteQrCodeMutation = useDeleteQrCodeMutation();
	const handleDelete = useCallback(() => {
		setIsDeleting(true);
		const t = toast({
			title: 'QR code is being deleted',
			open: isDeleting,
			description: (
				<div className="flex space-x-2">
					<Loader2 className="mr-2 h-6 w-6 animate-spin" />{' '}
					<span>we are deleting your QR code</span>
				</div>
			),
		});

		deleteQrCodeMutation.mutate(qr.id, {
			onSuccess: () => {
				t.dismiss();
				setIsDeleting(false);

				posthog.capture('qr-code-deleted', {
					id: qr.id,
					content: qr.content,
				});
			},
			onError: () => {
				t.dismiss();
				toast({
					title: trans('qrCode.error.delete.title'),
					description: trans('qrCode.error.delete.message'),
					variant: 'destructive',
					duration: 5000,
				});
				setIsDeleting(false);
			},
		});
	}, [qr, isDeleting]);

	return (
		<TableRow
			className={`hover:bg-muted/90 rounded-lg border-none shadow ${isDeleting ? 'bg-muted/70' : 'bg-white'}`}
		>
			<TableCell className="table-cell rounded-l-lg">
				<div className="flex space-x-8">
					<div className="ml-4 hidden flex-col justify-center sm:flex">
						{GetQrCodeIconByContentType(qr)}
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
								additionalStyles="max-h-[100px] max-w-[100px] lg:max-h-[100px] lg:max-w-[100px]"
							/>
						)}
					</div>
				</div>
			</TableCell>
			<TableCell className="font-medium">
				<>
					<Tooltip>
						<TooltipTrigger asChild disabled>
							<div className="inline-block max-w-[400px] truncate overflow-hidden text-ellipsis whitespace-nowrap">
								{GetNameByContentType(qr)}
							</div>
						</TooltipTrigger>
						<TooltipContent side="top">
							<div className="max-w-[400px]">{GetNameByContentType(qr)}</div>
						</TooltipContent>
					</Tooltip>
				</>
			</TableCell>
			<TableCell className="hidden sm:table-cell">
				{qr.shortUrl && (
					<Badge variant="outline">
						{qr.shortUrl.isActive
							? trans('analytics.stateActive')
							: trans('analytics.stateInactive')}
					</Badge>
				)}
			</TableCell>
			<TableCell>{qr.shortUrl && <ViewComponent shortUrl={qr.shortUrl} />}</TableCell>
			<TableCell className="hidden md:table-cell">
				<span>{formatDate(qr.createdAt)}</span>
			</TableCell>
			<TableCell className="rounded-r-lg">
				<DropdownMenu>
					<DropdownMenuTrigger asChild disabled={isDeleting}>
						<Button aria-haspopup="true" size="icon" variant="ghost" disabled={isDeleting}>
							<EllipsisVerticalIcon width={28} height={28} />
							<span className="sr-only">Toggle menu</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>{trans('qrCode.actionsMenu.title')}</DropdownMenuLabel>
						<DropdownMenuItem>
							<Link href={`/collection/qr-code/${qr.id}`} prefetch>
								<div className="flex items-center space-x-2">
									{trans('qrCode.actionsMenu.edit')}
								</div>
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem>
							<QrCodeDownloadBtn qrCode={qr} noStyling />
						</DropdownMenuItem>
						<DropdownMenuItem>
							<div className="cursor-pointer" onClick={handleDelete}>
								{trans('qrCode.actionsMenu.delete')}
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
};
