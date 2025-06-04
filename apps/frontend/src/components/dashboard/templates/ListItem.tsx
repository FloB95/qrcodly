'use client';

import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/24/solid';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import posthog from 'posthog-js';
import { formatDate } from '@/lib/utils';
import type { TConfigTemplate, TQrCode } from '@shared/schemas';
import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useDeleteConfigTemplateMutation } from '@/lib/api/config-template';
import { toast } from '@/components/ui/use-toast';
import { DynamicQrCode } from '@/components/qr-generator/DynamicQrCode';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export const TemplateListItem = ({
	template,
}: {
	template: Omit<TConfigTemplate, 'isPredefined'>;
}) => {
	const t = useTranslations();
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);
	const router = useRouter();

	const deleteMutation = useDeleteConfigTemplateMutation();
	// const updateQrCodeMutation = useUpdateQrCodeMutation();

	const qrCodeData = useMemo<Pick<TQrCode, 'config' | 'content'>>(
		() => ({
			config: template.config,
			content: {
				type: 'url',
				data: {
					url: 'https://www.qrcodly.de/',
					isEditable: false,
				},
			},
		}),
		[template.config],
	);

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

		deleteMutation.mutate(template.id, {
			onSuccess: () => {
				toastId.dismiss();
				setIsDeleting(false);
				posthog.capture('template-code-deleted', { id: template.id, name: template.name });
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
	}, [template]);

	// const handleUpdate = useCallback(
	// 	(newName: string) => {
	// 		const oldName = template.name;
	// 		template.name = newName;
	// 		updateQrCodeMutation.mutate(
	// 			{ qrCodeId: template.id, data: { name: newName } },
	// 			{
	// 				onSuccess: () => {
	// 					posthog.capture('template-code-updated', {
	// 						id: template.id,
	// 						data: {
	// 							name: newName,
	// 						},
	// 					});
	// 				},
	// 				onError: (error) => {
	// 					template.name = oldName;
	// 					Sentry.captureException(error);
	// 					toast({
	// 						title: t('qrCode.error.update.title'),
	// 						description: t('qrCode.error.update.message'),
	// 						variant: 'destructive',
	// 						duration: 5000,
	// 					});
	// 				},
	// 			},
	// 		);
	// 	},
	// 	[template.id, template.name, updateQrCodeMutation],
	// );

	return (
		<>
			<TableRow
				// onClick={() => {
				// 	router.push(`/collection/template-code/${template.id}`);
				// }}
				className={`cursor-default rounded-lg shadow ${isDeleting ? '!bg-muted/70' : 'bg-white'}`}
			>
				<TableCell className="rounded-l-lg">
					<div className="flex space-x-8">
						<div className="h-[90px] w-[90px] overflow-hidden">
							{template.previewImage ? (
								<Image
									src={template.previewImage}
									width={180}
									height={180}
									alt="QR code preview"
									loading="lazy"
								/>
							) : (
								<DynamicQrCode qrCode={qrCodeData} additionalStyles="max-h-[100px] max-w-[100px]" />
							)}
						</div>
					</div>
				</TableCell>

				<TableCell className="font-medium max-w-[400px] truncate">
					<div
						className="group relative pr-6 inline-block"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setNameDialogOpen(true);
						}}
					>
						{template.name && template.name != '' ? (
							template.name
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

				<TableCell className="hidden md:table-cell">{formatDate(template.createdAt)}</TableCell>

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

							{/* <DropdownMenuItem asChild>
								<Link
									className="cursor-pointer"
									href={`/collection/template-code/${template.id}`}
									onClick={(e) => e.stopPropagation()}
								>
									{t('qrCode.actionsMenu.view')}
								</Link>
							</DropdownMenuItem> */}

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
			{/* 
			<NameDialog
				dialogHeadline={t('qrCode.updateQrCodeName.title')}
				placeholder={t('qrCode.updateQrCodeName.placeholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleUpdate}
				defaultValue={template.name ?? ''}
			/> */}
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
