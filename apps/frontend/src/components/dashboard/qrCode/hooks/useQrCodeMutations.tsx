import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useDeleteQrCodeMutation, useUpdateQrCodeMutation } from '@/lib/api/qr-code';
import { useToggleActiveStateMutation } from '@/lib/api/url-shortener';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';

export const useQrCodeMutations = (qr: TQrCodeWithRelationsResponseDto) => {
	const t = useTranslations();
	const [isDeleting, setIsDeleting] = useState(false);

	const deleteMutation = useDeleteQrCodeMutation();
	const toggleMutation = useToggleActiveStateMutation();
	const updateQrCodeMutation = useUpdateQrCodeMutation();

	const handleToggle = useCallback(() => {
		if (!qr.shortUrl) return;

		toggleMutation.mutate(qr.shortUrl.shortCode, {
			onSuccess: () => {
				posthog.capture('short-url-toggled', {
					id: qr.shortUrl!.id,
					isActive: qr.shortUrl?.isActive,
				});
			},
			onError: (error) => {
				Sentry.captureException(error);
				toast({
					title: t('shortUrl.error.toggleActiveState.title'),
					description: t('shortUrl.error.toggleActiveState.message'),
					variant: 'destructive',
					duration: 5000,
				});
			},
		});
	}, [qr.shortUrl, toggleMutation, t]);

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

		deleteMutation.mutate(qr.id, {
			onSuccess: () => {
				toastId.dismiss();
				setIsDeleting(false);
				posthog.capture('qr-code-deleted', { id: qr.id, content: qr.content });
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
	}, [qr, deleteMutation, t]);

	const handleUpdateName = useCallback(
		(newName: string) => {
			const oldName = qr.name;
			qr.name = newName;

			updateQrCodeMutation.mutate(
				{ qrCodeId: qr.id, data: { name: newName } },
				{
					onSuccess: () => {
						posthog.capture('qr-code-updated', {
							id: qr.id,
							data: { name: newName },
						});
					},
					onError: (error) => {
						qr.name = oldName;
						Sentry.captureException(error);
						toast({
							title: t('qrCode.error.update.title'),
							description: t('qrCode.error.update.message'),
							variant: 'destructive',
							duration: 5000,
						});
					},
				},
			);
		},
		[qr, updateQrCodeMutation, t],
	);

	return {
		isDeleting,
		handleToggle,
		handleDelete,
		handleUpdateName,
	};
};
