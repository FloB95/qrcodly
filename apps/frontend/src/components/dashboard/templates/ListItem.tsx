'use client';

import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
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
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

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
			<TableRow className={cn(isDeleting && 'opacity-50')}>
				{/* Template Preview */}
				<TableCell className="w-[72px] py-2 pr-2">
					<HoverCard openDelay={200} closeDelay={100}>
						<HoverCardTrigger asChild>
							<div className="flex items-center gap-2">
								<div className="size-14 shrink-0 overflow-hidden rounded">
									{template.previewImage ? (
										<Image
											src={template.previewImage}
											width={56}
											height={56}
											alt="Template preview"
											className="size-14 object-cover"
											loading="lazy"
										/>
									) : (
										<DynamicQrCode qrCode={qrCodeData} additionalStyles="max-h-14 max-w-14" />
									)}
								</div>
							</div>
						</HoverCardTrigger>
						<HoverCardContent side="right" className="w-auto p-2">
							<div className="h-[200px] w-[200px] overflow-hidden rounded">
								{template.previewImage ? (
									<Image
										src={template.previewImage}
										width={200}
										height={200}
										alt="Template preview"
										className="h-[200px] w-[200px] object-cover"
									/>
								) : (
									<DynamicQrCode
										qrCode={qrCodeData}
										additionalStyles="max-h-[200px] max-w-[200px]"
									/>
								)}
							</div>
						</HoverCardContent>
					</HoverCard>
				</TableCell>

				{/* Name */}
				<TableCell className="py-2">
					<div className="flex items-center gap-2 min-w-0">
						<div
							className="group relative min-w-0 cursor-pointer"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setNameDialogOpen(true);
							}}
						>
							<div className="flex items-center gap-2 min-w-0">
								<span className="truncate text-sm font-medium max-w-[200px]">
									{template.name && template.name !== '' ? (
										template.name
									) : (
										<span className="text-muted-foreground">{t('general.noName')}</span>
									)}
								</span>
								<Button
									size="icon"
									variant="ghost"
									className="hidden group-hover:inline-flex h-5 w-5 shrink-0"
								>
									<PencilIcon className="size-3" />
								</Button>
							</div>
						</div>
					</div>
				</TableCell>

				{/* Created Date */}
				<TableCell className="hidden md:table-cell py-2 text-sm text-muted-foreground">
					{formatDate(template.createdAt)}
				</TableCell>

				{/* Actions */}
				<TableCell className="w-[60px] py-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
								<EllipsisVerticalIcon className="size-6" />
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
								<Link className="cursor-pointer" href={`/dashboard/templates/${template.id}/edit`}>
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

export const SkeletonTemplateListItem = () => {
	return (
		<TableRow>
			<TableCell className="py-2">
				<Skeleton className="size-14 rounded" />
			</TableCell>
			<TableCell className="py-2">
				<Skeleton className="h-4 w-32" />
			</TableCell>
			<TableCell className="hidden md:table-cell py-2">
				<Skeleton className="h-4 w-20" />
			</TableCell>
			<TableCell className="py-2">
				<Skeleton className="h-8 w-8 rounded" />
			</TableCell>
		</TableRow>
	);
};
