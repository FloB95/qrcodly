'use client';

import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/utils';
import type { TTagResponseDto } from '@shared/schemas';
import { TagEditDialog } from './TagEditDialog';
import { useDeleteTagMutation } from '@/lib/api/tag';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

type TagListItemProps = {
	tag: TTagResponseDto;
};

export const TagListItem = ({ tag }: TagListItemProps) => {
	const t = useTranslations('tags');
	const tGeneral = useTranslations('general');
	const [editOpen, setEditOpen] = useState(false);
	const deleteMutation = useDeleteTagMutation();

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(tag.id);
			posthog.capture('tag-deleted', { id: tag.id, name: tag.name });
			toast({
				title: t('toast.deletedTitle'),
				description: t('toast.deletedDescription'),
				duration: 5000,
			});
		} catch (e: unknown) {
			const error = e as ApiError;

			if (error.code >= 500) {
				Sentry.captureException(error, { extra: { id: tag.id, name: tag.name } });
			}

			posthog.capture('error:tag-deleted', {
				id: tag.id,
				error: { code: error.code, message: error.message },
			});

			toast({
				variant: 'destructive',
				title: t('toast.deleteErrorTitle'),
				description: error.message,
				duration: 5000,
			});
		}
	};

	return (
		<>
			<TableRow>
				{/* Color */}
				<TableCell className="w-[60px] py-2">
					<div className="size-6 rounded-full border" style={{ backgroundColor: tag.color }} />
				</TableCell>

				{/* Name */}
				<TableCell className="py-2">
					<span className="text-sm font-medium">{tag.name}</span>
				</TableCell>

				{/* Usage */}
				<TableCell className="py-2">
					{(tag.qrCodeCount ?? 0) > 0 ? (
						<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<QrCodeIcon className="size-4 shrink-0" />
							<span>
								{tag.qrCodeCount} {t('table.qrCodes')}
							</span>
						</div>
					) : (
						<span className="text-sm text-muted-foreground">—</span>
					)}
				</TableCell>

				{/* Created Date */}
				<TableCell className="hidden md:table-cell py-2 text-sm text-muted-foreground">
					{formatDate(tag.createdAt)}
				</TableCell>

				{/* Actions */}
				<TableCell className="w-[100px] py-2">
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={() => setEditOpen(true)}
							aria-label={tGeneral('edit')}
						>
							<PencilIcon className="size-4" />
						</Button>

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-destructive"
									aria-label={tGeneral('delete')}
								>
									<TrashIcon className="size-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
									<AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{tGeneral('cancel')}</AlertDialogCancel>
									<AlertDialogAction onClick={handleDelete}>{tGeneral('delete')}</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</TableCell>
			</TableRow>

			<TagEditDialog tag={tag} open={editOpen} onOpenChange={setEditOpen} />
		</>
	);
};

export const SkeletonTagListItem = () => {
	return (
		<TableRow>
			<TableCell className="py-2">
				<Skeleton className="size-6 rounded-full" />
			</TableCell>
			<TableCell className="py-2">
				<Skeleton className="h-4 w-32" />
			</TableCell>
			<TableCell className="py-2">
				<Skeleton className="h-4 w-20" />
			</TableCell>
			<TableCell className="hidden md:table-cell py-2">
				<Skeleton className="h-4 w-20" />
			</TableCell>
			<TableCell className="py-2">
				<Skeleton className="h-8 w-16" />
			</TableCell>
		</TableRow>
	);
};
