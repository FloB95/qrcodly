'use client';

import { LoginRequiredDialog } from '../LoginRequiredDialog';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { NameDialog } from '../NameDialog';
import { Button } from '@/components/ui/button';
import { objDiff, QrCodeDefaults, type TQrCodeOptions } from '@shared/schemas';
import { useCreateConfigTemplateMutation } from '@/lib/api/config-template';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';

const QrCodeSaveTemplateBtn = ({ config }: { config: TQrCodeOptions }) => {
	const t = useTranslations('templates');
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);

	const createConfigTemplateMutation = useCreateConfigTemplateMutation();

	const handleSave = async (templateName: string) => {
		setNameDialogOpen(false);
		try {
			await createConfigTemplateMutation.mutateAsync(
				{
					config,
					name: templateName,
				},
				{
					onSuccess: () => {
						toast({
							title: t('templateCreatedTitle'),
							description: t('templateCreatedDescription'),
							duration: 5000,
						});

						posthog.capture('config-template-created', {
							templateName: templateName,
						});
					},
					onError: (e: Error) => {
						const error = e as ApiError;

						if (error.code >= 500) {
							Sentry.captureException(error, {
								extra: {
									templateName: templateName,
									config,
									error: {
										code: error.code,
										message: error.message,
										fieldErrors: error?.fieldErrors,
									},
								},
							});
						}

						posthog.capture('error:config-template-created', {
							templateName: templateName,
							config,
						});

						toast({
							variant: 'destructive',
							title: t('templateCreatedErrorTitle'),
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
		createConfigTemplateMutation.isPending ||
		Object.keys(objDiff(QrCodeDefaults, config)).length === 0;

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="link"
						className="cursor-pointer"
						isLoading={createConfigTemplateMutation.isPending}
						onClick={() => {
							if (!isSignedIn) {
								// Store the config in localStorage before prompting login
								localStorage.setItem('unsavedQrConfig', JSON.stringify(config));
								setAlertOpen(true);
								return;
							}
							setNameDialogOpen(true);
						}}
						disabled={isDisabled}
					>
						{t('saveAsBtn')}
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

export default QrCodeSaveTemplateBtn;
