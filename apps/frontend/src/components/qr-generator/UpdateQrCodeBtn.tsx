'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { isDynamic, objDiff, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { qrCodeQueryKeys, useUpdateQrCodeMutation } from '@/lib/api/qr-code';
import { QrCodeUpdateDialog, UPDATE_DIALOG_DO_NOT_SHOW_AGAIN_KEY } from './QrCodeUpdateDialog';
import { useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/ApiError';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';

type UpdateBtnDto = Pick<
	TQrCodeWithRelationsResponseDto,
	'id' | 'name' | 'config' | 'content' | 'shortUrl'
>;
const UpdateQrCodeBtn = ({ qrCode }: { qrCode: UpdateBtnDto }) => {
	const t = useTranslations('qrCode');
	const [hasMounted, setHasMounted] = useState(false);
	const [showInfoDialog, setShowInfoDialog] = useState(false);
	const [infoDialogIsOpen, setInfoDialogIsOpen] = useState(false);
	const queryClient = useQueryClient();
	const updateQrCodeMutation = useUpdateQrCodeMutation();
	const { latestQrCode, updateLatestQrCode } = useQrCodeGeneratorStore((state) => state);
	const IS_DYNAMIC = !!qrCode.shortUrl && isDynamic(qrCode.content);

	// Check if valid changes were made by comparing current content with original
	const hasValidChanges =
		Object.keys(objDiff(qrCode.content, latestQrCode?.content)).length > 0 ||
		qrCode.name !== latestQrCode?.name;

	useEffect(() => {
		setHasMounted(true);
		const saved = localStorage.getItem(UPDATE_DIALOG_DO_NOT_SHOW_AGAIN_KEY);
		setShowInfoDialog(saved !== 'true' && !IS_DYNAMIC);
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

						// Update latestQrCode to reflect the new saved state
						updateLatestQrCode({
							name: qrCode.name,
							config: qrCode.config,
							content: qrCode.content,
						});

						queryClient.refetchQueries({ queryKey: qrCodeQueryKeys.listQrCodes });
						posthog.capture('qr-code-updated', {
							name: qrCode.name,
							config: qrCode.config,
							content: qrCode.content,
						});
					},
					onError: (e: Error) => {
						const error = e as ApiError;

						if (error.code >= 500) {
							Sentry.captureException(error, {
								extra: {
									error: {
										name: qrCode.name,
										config: qrCode.config,
										content: qrCode.content,
										message: error.message,
										fieldErrors: error?.fieldErrors,
									},
								},
							});
						}

						posthog.capture('error:qr-code-updated', {
							name: qrCode.name,
							config: qrCode.config,
							content: qrCode.content,
							message: error.message,
							fieldErrors: error?.fieldErrors,
						});

						toast({
							variant: 'destructive',
							title: t('update.errorTitle'),
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
				disabled={!hasMounted || !hasValidChanges || updateQrCodeMutation.isPending}
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
