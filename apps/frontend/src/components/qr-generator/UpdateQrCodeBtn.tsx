'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getDefaultContentByType, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { qrCodeQueryKeys, useUpdateQrCodeMutation } from '@/lib/api/qr-code';
import { QrCodeUpdateDialog, UPDATE_DIALOG_DO_NOT_SHOW_AGAIN_KEY } from './QrCodeUpdateDialog';
import { useQueryClient } from '@tanstack/react-query';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';

type UpdateBtnDto = Pick<TQrCodeWithRelationsResponseDto, 'id' | 'name' | 'config' | 'content'>;
const UpdateQrCodeBtn = ({ qrCode }: { qrCode: UpdateBtnDto }) => {
	const t = useTranslations('qrCode');
	const [hasMounted, setHasMounted] = useState(false);
	const [infoDialogIsOpen, setInfoDialogIsOpen] = useState(false);
	const showInfoDialog = localStorage.getItem(UPDATE_DIALOG_DO_NOT_SHOW_AGAIN_KEY) !== 'true';
	const queryClient = useQueryClient();
	const updateQrCodeMutation = useUpdateQrCodeMutation();
	const { latestQrCode } = useQrCodeGeneratorStore((state) => state);
	const hasChanged =
		JSON.stringify(qrCode.content) !== JSON.stringify(latestQrCode?.content) ||
		JSON.stringify(qrCode.config) !== JSON.stringify(latestQrCode?.config) ||
		JSON.stringify(qrCode.name) !== JSON.stringify(latestQrCode?.name);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const handleUpdate = async () => {
		try {
			await updateQrCodeMutation.mutateAsync(
				{
					qrCodeId: qrCode.id,
					data: {
						config: qrCode.config,
						content: qrCode.content,
						name: qrCode.name,
					},
				},
				{
					onSuccess: () => {
						toast({
							title: t('update.successTitle'),
							description: t('update.successDescription'),
							duration: 5000,
						});

						queryClient.invalidateQueries({ queryKey: qrCodeQueryKeys.listQrCodes });
						posthog.capture('qr-code-updated', {
							name: qrCode.name,
							config: qrCode.config,
							content: qrCode.content,
						});
					},
					onError: (e) => {
						Sentry.captureException(e);
						toast({
							variant: 'destructive',
							title: t('update.errorTitle'),
							description: t('update.errorDescription'),
							duration: 5000,
						});

						posthog.capture('error:qr-code-updated', {
							name: qrCode.name,
							config: qrCode.config,
							content: qrCode.content,
						});
					},
				},
			);
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<>
			<Button
				className="cursor-pointer"
				isLoading={updateQrCodeMutation.isPending}
				onClick={() => {
					if (showInfoDialog) {
						setInfoDialogIsOpen(true);
					} else {
						handleUpdate();
					}
				}}
				disabled={
					!hasMounted ||
					!hasChanged ||
					!(
						JSON.stringify(qrCode.content) !==
							JSON.stringify(getDefaultContentByType(qrCode.content.type)) &&
						!updateQrCodeMutation.isPending
					)
				}
			>
				{t('updateBtn')}
			</Button>
			<QrCodeUpdateDialog
				isOpen={infoDialogIsOpen}
				setIsOpen={setInfoDialogIsOpen}
				onSubmit={handleUpdate}
			/>
		</>
	);
};

export default UpdateQrCodeBtn;
