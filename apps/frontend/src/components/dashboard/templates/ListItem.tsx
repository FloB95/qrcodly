'use client';

import { EllipsisVerticalIcon, StarIcon } from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/24/solid';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import posthog from 'posthog-js';
import { fetchImageAsBase64, formatDate, safeLocalStorage } from '@/lib/utils';
import type { TConfigTemplate, TQrCode } from '@shared/schemas';
import * as Sentry from '@sentry/nextjs';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
	useDeleteConfigTemplateMutation,
	useUpdateConfigTemplateMutation,
} from '@/lib/api/config-template';
import { toast } from '@/components/ui/use-toast';
import { DynamicQrCode } from '@/components/qr-generator/DynamicQrCode';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
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
import { NameDialog } from '@/components/qr-generator/NameDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
	const updateMutation = useUpdateConfigTemplateMutation();

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
			title: t('templates.delete.beingDeleted'),
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
				posthog.capture('config-template-deleted', { id: template.id, name: template.name });
			},
			onError: (error) => {
				Sentry.captureException(error);
				toastId.dismiss();
				setIsDeleting(false);
				toast({
					title: t('templates.delete.errorTitle'),
					description: t('templates.delete.errorDescription'),
					variant: 'destructive',
				});
			},
		});
	}, [template]);

	const handleUpdate = useCallback(
		(newName: string) => {
			template.name = newName;
			updateMutation.mutate({ configTemplateId: template.id, data: { name: newName } });
		},
		[template.id, template.name, updateMutation],
	);

	const qrCodeFromTemplate = useCallback(async () => {
		const configToSave = template.config;
		try {
			if (configToSave.image) {
				configToSave.image = await fetchImageAsBase64(configToSave.image);
			}
			posthog.capture('create-qr-code-from-config-template', {
				id: template.id,
				templateName: template.name,
			});
		} catch (error) {
			console.error('Failed to convert image to base64:', error);
		}
		safeLocalStorage.setItem('unsavedQrConfig', JSON.stringify(configToSave));
		router.push('/');
	}, []);

	return (
		<>
			<TableRow
				className={`cursor-default rounded-lg shadow ${isDeleting ? '!bg-muted/70' : 'bg-white'}`}
			>
				<TableCell className="rounded-l-lg max-w-52">
					<div className="flex space-x-8 w-50">
						<div className="ml-4 hidden sm:flex items-center">
							<StarIcon className="mr-2 h-6 w-6" />
						</div>
						<div className="h-[90px] w-[90px] overflow-hidden">
							{template.previewImage ? (
								<Image
									src={template.previewImage}
									width={180}
									height={180}
									alt="Template preview"
									loading="lazy"
								/>
							) : (
								<DynamicQrCode qrCode={qrCodeData} additionalStyles="max-h-[100px] max-w-[100px]" />
							)}
						</div>
					</div>
				</TableCell>

				<TableCell className="font-medium truncate w-full">
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
							<DropdownMenuSeparator />

							<DropdownMenuItem asChild>
								<span className="cursor-pointer" onClick={qrCodeFromTemplate}>
									{t('templates.actionsMenu.qrCodeFromTemplate')}
								</span>
							</DropdownMenuItem>

							<DropdownMenuItem asChild>
								<Link className="cursor-pointer" href={`/collection/template/${template.id}/edit`}>
									{t('qrCode.actionsMenu.edit')}
								</Link>
							</DropdownMenuItem>

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
										{t('templates.confirmPopup.confirmBtn')}
									</DropdownMenuItem>
								</AlertDialogTrigger>
								<AlertDialogContent onClick={(e) => e.stopPropagation()}>
									<AlertDialogHeader>
										<AlertDialogTitle>{t('templates.confirmPopup.title')}</AlertDialogTitle>
										<AlertDialogDescription>
											{t('templates.confirmPopup.description')}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel asChild>
											<Button variant="secondary" onClick={(e) => e.stopPropagation()}>
												{t('templates.confirmPopup.cancelBtn')}
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
											{t('templates.confirmPopup.confirmBtn')}
										</Button>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</DropdownMenuContent>
					</DropdownMenu>
				</TableCell>
			</TableRow>
			<NameDialog
				dialogHeadline={t('templates.update.updateName.title')}
				placeholder={t('templates.update.updateName.placeholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleUpdate}
				defaultValue={template.name ?? ''}
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
