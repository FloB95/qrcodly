'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
	QrCodeGeneratorStoreProvider,
	defaultInitState,
} from '@/components/provider/QrCodeConfigStoreProvider';
import { SettingsForm } from '@/components/qr-generator/style/SettingsForm';
import { DynamicQrCode } from '@/components/qr-generator/DynamicQrCode';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { NameDialog } from '@/components/qr-generator/NameDialog';
import { Button } from '@/components/ui/button';
import { useCreateConfigTemplateMutation } from '@/lib/api/config-template';
import { toast } from '@/components/ui/use-toast';
import { objDiff, QrCodeDefaults } from '@shared/schemas';
import type { ApiError } from '@/lib/api/ApiError';

type CreateTemplateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const CreateTemplateSaveSection = ({ onClose }: { onClose: () => void }) => {
	const t = useTranslations('templates');
	const { config, content } = useQrCodeGeneratorStore((state) => state);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);
	const createMutation = useCreateConfigTemplateMutation();

	const isDisabled =
		createMutation.isPending || Object.keys(objDiff(QrCodeDefaults, config)).length === 0;

	const handleSave = useCallback(
		async (templateName: string) => {
			setNameDialogOpen(false);
			try {
				await createMutation.mutateAsync(
					{ config, name: templateName },
					{
						onSuccess: () => {
							toast({
								title: t('templateCreatedTitle'),
								description: t('templateCreatedDescription'),
								duration: 5000,
							});
							posthog.capture('config-template-created', {
								templateName,
							});
							onClose();
						},
						onError: (e: Error) => {
							const error = e as ApiError;
							if (error.code >= 500) {
								Sentry.captureException(error, {
									extra: { templateName, config },
								});
							}
							posthog.capture('error:config-template-created', {
								templateName,
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
		},
		[config, createMutation, onClose, t],
	);

	return (
		<div className="flex flex-col items-center lg:sticky lg:top-0">
			<DynamicQrCode
				qrCode={{ content, config }}
				additionalStyles="max-h-[120px] max-w-[120px] sm:max-h-[150px] sm:max-w-[150px] lg:max-h-[200px] lg:max-w-[200px] xl:max-h-[250px] xl:max-w-[250px]"
			/>
			<div className="mt-4 w-full max-w-[250px]">
				<Button
					className="w-full cursor-pointer"
					isLoading={createMutation.isPending}
					onClick={() => setNameDialogOpen(true)}
					disabled={isDisabled}
				>
					{t('saveAsBtn')}
				</Button>
			</div>
			<NameDialog
				dialogHeadline={t('savePopup.title')}
				placeholder={t('savePopup.placeholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleSave}
			/>
		</div>
	);
};

export const CreateTemplateDialog = ({ open, onOpenChange }: CreateTemplateDialogProps) => {
	const t = useTranslations('collection');
	const [providerKey, setProviderKey] = useState(0);

	// Reset store when dialog opens
	useEffect(() => {
		if (open) {
			setProviderKey((k) => k + 1);
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[calc(100%-3rem)] lg:max-w-4xl xl:max-w-5xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t('addTemplateBtn')}</DialogTitle>
				</DialogHeader>
				<QrCodeGeneratorStoreProvider key={providerKey} initState={defaultInitState}>
					<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
						<div className="order-first flex justify-center lg:order-last lg:shrink-0">
							<CreateTemplateSaveSection onClose={() => onOpenChange(false)} />
						</div>
						<div className="flex-1 min-w-0">
							<SettingsForm />
						</div>
					</div>
				</QrCodeGeneratorStoreProvider>
			</DialogContent>
		</Dialog>
	);
};
