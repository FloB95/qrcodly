'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { type TCreateQrCodeDto } from '@shared/schemas';
import { toast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import { qrCodeQueryKeys, useCreateQrCodeMutation } from '@/lib/api/qr-code';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { LoginRequiredDialog } from './LoginRequiredDialog';
import { NameDialog } from './NameDialog';
import { useQueryClient } from '@tanstack/react-query';
import { urlShortenerQueryKeys } from '@/lib/api/url-shortener';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import type { ApiError } from '@/lib/api/ApiError';
import { isContentAtDefault } from '@/lib/qr-code-helpers';

const SaveQrCodeBtn = ({ qrCode }: { qrCode: TCreateQrCodeDto }) => {
	const t = useTranslations('qrCode');
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);
	const [hasMounted, setHasMounted] = useState(false);
	const queryClient = useQueryClient();
	const { resetStore, updateLatestQrCode } = useQrCodeGeneratorStore((state) => state);

	const createQrCodeMutation = useCreateQrCodeMutation();

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const handleSave = async (qrCodeName: string) => {
		setNameDialogOpen(false);

		try {
			await createQrCodeMutation.mutateAsync(
				{
					config: qrCode.config,
					content: qrCode.content,
					name: qrCodeName,
				},
				{
					onSuccess: () => {
						toast({
							title: t('download.successTitle'),
							description: t('download.successDescription'),
							duration: 5000,
						});

						void Promise.all([
							queryClient.refetchQueries({ queryKey: qrCodeQueryKeys.listQrCodes }),
							queryClient.refetchQueries({ queryKey: urlShortenerQueryKeys.reservedShortUrl }),
						]);

						if (qrCode.content.type === 'url' && qrCode.content.data.isEditable) {
							resetStore();
						}

						updateLatestQrCode({
							config: qrCode.config,
							content: qrCode.content,
						});

						posthog.capture('qr-code-created', {
							qrCodeName: qrCodeName,
						});
					},
					onError: (e: Error) => {
						const error = e as ApiError;

						if (error.code >= 500) {
							Sentry.captureException(error, {
								extra: {
									qrCodeName: qrCodeName,
									qrCode,
									error: {
										code: error.code,
										message: error.message,
										fieldErrors: error?.fieldErrors,
									},
								},
							});

							posthog.capture('error:qr-code-created', {
								qrCodeName: qrCodeName,
								qrCode,
								error: {
									code: error.code,
									message: error.message,
									fieldErrors: error?.fieldErrors,
								},
							});
						}

						toast({
							variant: 'destructive',
							title: t('download.errorTitle'),
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

	const isDisabled =
		!hasMounted ||
		isContentAtDefault(qrCode.content, isSignedIn === true) ||
		createQrCodeMutation.isPending;

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={'outlineStrong'}
						className="cursor-pointer"
						isLoading={createQrCodeMutation.isPending}
						onClick={() => {
							if (!isSignedIn) {
								// Store the config in localStorage before prompting login
								localStorage.setItem('unsavedQrContent', JSON.stringify(qrCode.content));
								localStorage.setItem('unsavedQrConfig', JSON.stringify(qrCode.config));
								setAlertOpen(true);
								return;
							}
							setNameDialogOpen(true);
						}}
						disabled={isDisabled}
					>
						{t('storeBtn')}
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p>{t('saveInfo')}</p>
				</TooltipContent>
			</Tooltip>

			<LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />

			<NameDialog
				dialogHeadline={t('savePopup.title')}
				placeholder={t('savePopup.placeholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleSave}
			/>
		</>
	);
};

export default SaveQrCodeBtn;
