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
import { objDiff, QrCodeDefaults } from '@shared/schemas';
import { getQrCodeStylingOptions } from '@/lib/qr-code-helpers';
import { fetchImageAsBase64 } from '@/lib/utils';
import posthog from 'posthog-js';
import { NameDialog } from '@/components/qr-generator/NameDialog';
import { useCreateConfigTemplateMutation } from '@/lib/api/config-template';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';
import { ShareDialog } from '@/components/qr-code-share/ShareDialog';

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
	const tTemplates = useTranslations('templates');
	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
	const [templateNameDialogOpen, setTemplateNameDialogOpen] = useState(false);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const createConfigTemplateMutation = useCreateConfigTemplateMutation();

	useEffect(() => {
		import('qr-code-styling').then((module) => {
			QRCodeStyling = module.default;
			const options = getQrCodeStylingOptions(qr.config, qr.content, {
				shortUrl: qr.shortUrl || undefined,
			});
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

	const handleCreateTemplate = async (templateName: string) => {
		setTemplateNameDialogOpen(false);
		try {
			// If the config has an image URL (S3), convert it to base64
			let configToSave = qr.config;
			if (qr.config.image?.startsWith('http')) {
				try {
					const base64 = await fetchImageAsBase64(qr.config.image);
					configToSave = { ...qr.config, image: base64 };
				} catch (imageError) {
					console.error('Failed to convert image to base64:', imageError);
					// Continue without the image if conversion fails
					configToSave = { ...qr.config, image: undefined };
				}
			}

			await createConfigTemplateMutation.mutateAsync(
				{
					config: configToSave,
					name: templateName,
				},
				{
					onSuccess: () => {
						toast({
							title: tTemplates('templateCreatedTitle'),
							description: tTemplates('templateCreatedDescription'),
							duration: 5000,
						});

						posthog.capture('config-template-created-from-qr', {
							templateName: templateName,
							qrCodeId: qr.id,
						});
					},
					onError: (e: Error) => {
						const error = e as ApiError;

						if (error.code >= 500) {
							Sentry.captureException(error, {
								extra: {
									templateName: templateName,
									config: qr.config,
									qrCodeId: qr.id,
									error: {
										code: error.code,
										message: error.message,
										fieldErrors: error?.fieldErrors,
									},
								},
							});
						}

						posthog.capture('error:config-template-created-from-qr', {
							templateName: templateName,
							qrCodeId: qr.id,
						});

						toast({
							variant: 'destructive',
							title: tTemplates('templateCreatedErrorTitle'),
							description: error.message,
							duration: 5000,
						});
					},
				},
			);
		} catch (error) {
			console.error(error);
		}
	};

	const showContentFileDownload = qr.content.type === 'vCard' || qr.content.type === 'event';
	const contentFileLabel =
		qr.content.type === 'vCard'
			? t('qrCode.download.vcfFile')
			: qr.content.type === 'event'
				? t('qrCode.download.icsFile')
				: '';

	const isConfigDefault = Object.keys(objDiff(QrCodeDefaults, qr.config)).length === 0;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="icon" variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
					<EllipsisVerticalIcon className="size-6" />
					<span className="sr-only">Toggle menu</span>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuLabel>{t('qrCode.actionsMenu.title')}</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<DropdownMenuItem asChild>
					<Link
						className="cursor-pointer"
						href={`/dashboard/qr-codes/${qr.id}`}
						onClick={(e) => e.stopPropagation()}
					>
						{t('qrCode.actionsMenu.view')}
					</Link>
				</DropdownMenuItem>

				<DropdownMenuItem asChild>
					<Link
						className="cursor-pointer"
						href={`/dashboard/qr-codes/${qr.id}/edit`}
						onClick={(e) => e.stopPropagation()}
					>
						{t('qrCode.actionsMenu.edit')}
					</Link>
				</DropdownMenuItem>

				<DropdownMenuItem
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setShareDialogOpen(true);
					}}
					className="cursor-pointer"
				>
					{t('general.share')}
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

				{!isConfigDefault && (
					<DropdownMenuItem
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setTemplateNameDialogOpen(true);
						}}
						className="cursor-pointer"
					>
						{tTemplates('saveAsBtn')}
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

			<NameDialog
				dialogHeadline={tTemplates('savePopup.title')}
				placeholder={tTemplates('savePopup.placeholder')}
				isOpen={templateNameDialogOpen}
				setIsOpen={setTemplateNameDialogOpen}
				onSubmit={handleCreateTemplate}
			/>

			<ShareDialog
				qrCodeId={qr.id}
				trigger={null}
				open={shareDialogOpen}
				onOpenChange={setShareDialogOpen}
			/>
		</DropdownMenu>
	);
};
