'use client';

import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import QrCodeDownloadBtn from '@/components/qr-generator/QrCodeDownloadBtn';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';

interface QrCodeListItemActionsProps {
	qr: TQrCodeWithRelationsResponseDto;
	isDeleting: boolean;
	showDeleteConfirm: boolean;
	setShowDeleteConfirm: (show: boolean) => void;
	onToggle: () => void;
	onDelete: () => void;
}

export const QrCodeListItemActions = ({
	qr,
	isDeleting,
	showDeleteConfirm,
	setShowDeleteConfirm,
	onToggle,
	onDelete,
}: QrCodeListItemActionsProps) => {
	const t = useTranslations();

	return (
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
							onToggle();
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
									onDelete();
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
	);
};
