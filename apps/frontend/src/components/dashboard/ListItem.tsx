'use client';

import QrCodeDownloadBtn from '../qr-generator/QrCodeDownloadBtn';
import { useCallback, useState } from 'react';
import { toast } from '../ui/use-toast';
import { Button } from '../ui/button';
import { DynamicQrCode } from '../qr-generator/DynamicQrCode';
import {
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
import { Loader2 } from 'lucide-react';
import type { TQrCode, TQrCodeContentMap } from '@shared/schemas';
import { useDeleteQrCodeMutation } from '@/lib/api/qr-code';

const GetNameByContentType = (qr: TQrCode) => {
	switch (qr.contentType) {
		case 'url':
			return qr.content as TQrCodeContentMap['url'];
		case 'text':
			return qr.content as TQrCodeContentMap['text'];
		case 'wifi':
			const wifiData = qr.content as TQrCodeContentMap['wifi'];
			return wifiData?.ssid;
		case 'vCard':
			const vCardData = qr.content as TQrCodeContentMap['vCard'];
			return `${vCardData?.firstName ?? ''} ${vCardData?.lastName ?? ''}`;
		default:
			return 'Unknown';
	}
};

const GetQrCodeIconByContentType = (qr: TQrCode) => {
	switch (qr.contentType) {
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

export const DashboardListItem = ({ qr }: { qr: TQrCode }) => {
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
			},
			onError: () => {
				t.dismiss();
				toast({
					title: 'Error deleting QR code',
					description:
						'There was an error deleting your QR code. We got notified and will fix it soon.',
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
			<TableCell className="hidden rounded-l-lg sm:table-cell">
				<div className="flex space-x-8">
					<div className="ml-4 flex flex-col justify-center">{GetQrCodeIconByContentType(qr)}</div>
					<div className="h-[90px] w-[90px] overflow-hidden">
						{qr.previewImage ? (
							<img src={qr.previewImage} alt="QR code preview" loading="lazy" />
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
						<TooltipTrigger asChild>
							<div className="inline-block max-w-[400px] overflow-hidden text-ellipsis whitespace-nowrap">
								{GetNameByContentType(qr)}
							</div>
						</TooltipTrigger>
						<TooltipContent side="top">
							<div className="max-w-[400px]">{GetNameByContentType(qr)}</div>
						</TooltipContent>
					</Tooltip>
				</>
			</TableCell>
			<TableCell>
				<Badge variant="outline">Active</Badge>
			</TableCell>
			{/* <TableCell>
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex space-x-2">
                <span>10</span> <EyeIcon width={20} height={20} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">10 total views</TooltipContent>
          </Tooltip>
        </div>
      </TableCell> */}
			<TableCell className="hidden md:table-cell">
				<span>
					{qr.createdAt.toLocaleString(undefined, {
						day: 'numeric',
						month: 'short',
						year: 'numeric',
						hour: 'numeric',
						minute: 'numeric',
					})}
				</span>
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
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem>
							<QrCodeDownloadBtn qrCode={qr} noStyling />
						</DropdownMenuItem>
						<DropdownMenuItem>
							<div className="cursor-pointer" onClick={handleDelete}>
								Delete
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
};
