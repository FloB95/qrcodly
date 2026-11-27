'use client';

import { useTranslations } from 'next-intl';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface DeleteShortUrlDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isDeleting: boolean;
	/** The alias of the short URL, which is free again once it is deleted. */
	alias?: string | null;
}

export function DeleteShortUrlDialog({
	open,
	onOpenChange,
	onConfirm,
	isDeleting,
	alias,
}: DeleteShortUrlDialogProps) {
	const t = useTranslations('shortUrl');
	const tGeneral = useTranslations('general');

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
					<AlertDialogDescription>
						{t('delete.confirm')}
						{alias && ` ${t('alias.deleteNote', { alias })}`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel asChild>
						<Button variant="secondary">{tGeneral('cancel')}</Button>
					</AlertDialogCancel>
					<Button
						variant="destructive"
						disabled={isDeleting}
						isLoading={isDeleting}
						onClick={onConfirm}
					>
						{tGeneral('delete')}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
