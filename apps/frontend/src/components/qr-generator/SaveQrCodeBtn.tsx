'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getDefaultContentByType, type TCreateQrCodeDto } from '@shared/schemas';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { useCreateQrCodeMutation } from '@/lib/api/qr-code';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { LoginRequiredDialog } from './LoginRequiredDialog';
import { NameDialog } from './NameDialog';

const SaveQrCodeBtn = ({ qrCode }: { qrCode: TCreateQrCodeDto }) => {
	const t = useTranslations('qrCode');
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);
	const [hasMounted, setHasMounted] = useState(false);

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

						posthog.capture('qr-code-created', {
							qrCodeName: qrCodeName,
						});
					},
					onError: (e) => {
						Sentry.captureException(e);
						toast({
							variant: 'destructive',
							title: t('download.errorTitle'),
							description: e.message,
							duration: 5000,
						});

						posthog.capture('error:qr-code-created', {
							qrCodeName: qrCodeName,
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
						disabled={
							!hasMounted ||
							!(
								JSON.stringify(qrCode.content) !==
									JSON.stringify(getDefaultContentByType(qrCode.content.type)) &&
								!createQrCodeMutation.isPending
							)
						}
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
