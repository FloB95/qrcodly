'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { isDynamic, type TCreateQrCodeDto, type TQrCodeContent } from '@shared/schemas';
import { toast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';
import { useResolveTemplateImages } from '@/hooks/useHostedTemplateImage';
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
import { isContentAtDefault, isContentIncomplete } from '@/lib/qr-code-helpers';
import { safeLocalStorage } from '@/lib/utils';
import { hostedTrackingProps } from '@/lib/hosted-tracking';

const SaveQrCodeBtn = ({
	qrCode,
}: {
	qrCode: TCreateQrCodeDto & { config: NonNullable<TCreateQrCodeDto['config']> };
}) => {
	const t = useTranslations('qrCode');
	const tSafety = useTranslations('shortUrl');
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);
	const [hasMounted, setHasMounted] = useState(false);
	const queryClient = useQueryClient();
	const { resetStore, updateLatestQrCode, hostedUploadsPending } = useQrCodeGeneratorStore(
		(state) => state,
	);

	const createQrCodeMutation = useCreateQrCodeMutation();
	const resolveTemplateImages = useResolveTemplateImages();
	const [resolving, setResolving] = useState(false);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const handleSave = async (qrCodeName: string) => {
		setNameDialogOpen(false);

		// an adopted template's images are uploaded now, only for the page that is really saved
		let sent: TQrCodeContent;
		setResolving(true);
		try {
			sent = await resolveTemplateImages(qrCode.content);
		} catch (e) {
			toast({
				variant: 'destructive',
				title: t('download.errorTitle'),
				description: (e as Error).message,
				duration: 5000,
			});
			return;
		} finally {
			setResolving(false);
		}

		try {
			await createQrCodeMutation.mutateAsync(
				{
					config: qrCode.config,
					content: sent,
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

						// a saved dynamic code took the reserved short URL; editing on would target the next one
						if (isDynamic(qrCode.content)) {
							resetStore();
							// the reset generator is far shorter (a page editor turns back into the URL
							// form), which would leave the visitor further down the home page
							requestAnimationFrame(() => {
								const generator = document.getElementById('generator');
								if (generator && generator.getBoundingClientRect().top < 0) {
									generator.scrollIntoView({ behavior: 'smooth', block: 'start' });
								}
							});
						}

						updateLatestQrCode({
							config: qrCode.config,
							content: sent,
						});

						posthog.capture('qr-code-created', {
							qrCodeName: qrCodeName,
							contentType: qrCode.content.type,
							...hostedTrackingProps(qrCode.content),
						});
					},
					onError: (e: Error) => {
						const error = e as ApiError;

						if (error.code === 0 || error.code >= 500) {
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
						}

						posthog.capture('error:qr-code-created', {
							qrCodeName: qrCodeName,
							qrCode,
							error: {
								code: error.code,
								message: error.message,
								fieldErrors: error?.fieldErrors,
							},
						});

						const isMaliciousUrl = error.errorCode === 'MALICIOUS_DESTINATION_URL';
						toast({
							variant: 'destructive',
							title: isMaliciousUrl
								? tSafety('error.maliciousDestination.title')
								: t('download.errorTitle'),
							description: isMaliciousUrl
								? tSafety('error.maliciousDestination.message')
								: error.message,
							duration: 5000,
						});
					},
				},
			);
		} catch {}
	};

	const isDisabled =
		!hasMounted ||
		isContentAtDefault(qrCode.content, isSignedIn === true) ||
		isContentIncomplete(qrCode.content) ||
		Boolean(hostedUploadsPending) ||
		resolving ||
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
								safeLocalStorage.setItem('unsavedQrContent', JSON.stringify(qrCode.content));
								safeLocalStorage.setItem('unsavedQrConfig', JSON.stringify(qrCode.config));
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
