'use client';

import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { TQrCodeWithRelationsResponseDto, TFileExtension } from '@shared/schemas';
import { getQrCodeStylingOptions } from '@/lib/qr-code-helpers';
import posthog from 'posthog-js';

let QRCodeStyling: any;

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
	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);

	useEffect(() => {
		import('qr-code-styling').then((module) => {
			QRCodeStyling = module.default;
			const options = getQrCodeStylingOptions(qr.config, qr.content, qr.shortUrl || undefined);
			const instance = new QRCodeStyling(options);
			setQrCodeInstance(instance);
		});
	}, [qr.config, qr.content, qr.shortUrl]);

	const handleQrCodeDownload = async (fileExt: TFileExtension) => {
		if (!qrCodeInstance) return;

		posthog.capture('dashboard.qr-code-download', {
			qrCode: qr.id,
			name: qr.name || 'qr-code',
			extension: fileExt,
		});

		await qrCodeInstance.download({
			name: qr.name || 'qr-code',
			extension: fileExt,
		});
	};

	const handleContentFileDownload = () => {
		// Download vCard (.vcf) or Event (.ics) file
		window.open(`/api/dynamic-qr/${qr.id}`, '_blank');
	};

	const showContentFileDownload = qr.content.type === 'vCard' || qr.content.type === 'event';
	const contentFileLabel =
		qr.content.type === 'vCard'
			? t('qrCode.download.vcfFile')
			: qr.content.type === 'event'
				? t('qrCode.download.icsFile')
				: '';

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

				{/* Download with submenu */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>{t('qrCode.download.downloadBtn')}</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						{/* QR Code formats - nested submenu */}
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>QR Code</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										void handleQrCodeDownload('svg');
									}}
								>
									SVG
								</DropdownMenuItem>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										void handleQrCodeDownload('jpeg');
									}}
								>
									JPG
								</DropdownMenuItem>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										void handleQrCodeDownload('webp');
									}}
								>
									WEBP
								</DropdownMenuItem>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										void handleQrCodeDownload('png');
									}}
								>
									PNG
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuSub>

						{/* Content file download for vCard/Event */}
						{showContentFileDownload && (
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={(e) => {
									e.stopPropagation();
									handleContentFileDownload();
								}}
							>
								{contentFileLabel}
							</DropdownMenuItem>
						)}
					</DropdownMenuSubContent>
				</DropdownMenuSub>

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
