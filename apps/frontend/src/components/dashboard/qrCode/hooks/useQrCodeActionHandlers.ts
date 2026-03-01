'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { TQrCodeWithRelationsResponseDto, TFileExtension } from '@shared/schemas';
import { objDiff, QrCodeDefaults } from '@shared/schemas';
import { getQrCodeStylingOptions } from '@/lib/qr-code-helpers';
import { fetchImageAsBase64 } from '@/lib/utils';
import { useCreateConfigTemplateMutation } from '@/lib/api/config-template';
import { toast } from '@/components/ui/use-toast';
import type { ApiError } from '@/lib/api/ApiError';
import { useBehaviorTracker } from '@/components/dashboard/smart-tips/SmartTipsBehaviorTracker';

let QRCodeStyling: any;

export function useQrCodeActionHandlers(qr: TQrCodeWithRelationsResponseDto) {
	const t = useTranslations();
	const tTemplates = useTranslations('templates');
	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
	const [templateNameDialogOpen, setTemplateNameDialogOpen] = useState(false);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const createConfigTemplateMutation = useCreateConfigTemplateMutation();
	const { trackAction } = useBehaviorTracker();

	useEffect(() => {
		import('qr-code-styling').then((module) => {
			QRCodeStyling = module.default;
			const options = getQrCodeStylingOptions(qr.config, qr.content, {
				shortUrl: qr.shortUrl || undefined,
			});
			const instance = new QRCodeStyling(options);
			setQrCodeInstance(instance);
		});
	}, [qr.config, qr.content, qr.shortUrl]);

	const handleQrCodeDownload = async (fileExt: TFileExtension) => {
		if (!qrCodeInstance) return;

		posthog.capture('dashboard.qr-code-download', {
			qrCode: qr.id,
			name: qr.name || 'qr-code',
			extension: fileExt,
		});
		trackAction('qr-download');

		await qrCodeInstance.download({
			name: qr.name || 'qr-code',
			extension: fileExt,
		});
	};

	const handleContentFileDownload = () => {
		window.open(`/api/dynamic-qr/${qr.id}`, '_blank');
	};

	const handleCreateTemplate = async (templateName: string) => {
		setTemplateNameDialogOpen(false);
		try {
			let configToSave = qr.config;
			if (qr.config.image?.startsWith('http')) {
				try {
					const base64 = await fetchImageAsBase64(qr.config.image);
					configToSave = { ...qr.config, image: base64 };
				} catch (imageError) {
					console.error('Failed to convert image to base64:', imageError);
					configToSave = { ...qr.config, image: undefined };
				}
			}

			await createConfigTemplateMutation.mutateAsync(
				{
					config: configToSave,
					name: templateName,
				},
				{
					onSuccess: () => {
						toast({
							title: tTemplates('templateCreatedTitle'),
							description: tTemplates('templateCreatedDescription'),
							duration: 5000,
						});

						posthog.capture('config-template-created-from-qr', {
							templateName: templateName,
							qrCodeId: qr.id,
						});
					},
					onError: (e: Error) => {
						const error = e as ApiError;

						if (error.code >= 500) {
							Sentry.captureException(error, {
								extra: {
									templateName: templateName,
									config: qr.config,
									qrCodeId: qr.id,
									error: {
										code: error.code,
										message: error.message,
										fieldErrors: error?.fieldErrors,
									},
								},
							});
						}

						posthog.capture('error:config-template-created-from-qr', {
							templateName: templateName,
							qrCodeId: qr.id,
						});

						toast({
							variant: 'destructive',
							title: tTemplates('templateCreatedErrorTitle'),
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

	const showContentFileDownload = qr.content.type === 'vCard' || qr.content.type === 'event';
	const contentFileLabel =
		qr.content.type === 'vCard'
			? t('qrCode.download.vcfFile')
			: qr.content.type === 'event'
				? t('qrCode.download.icsFile')
				: '';

	const isConfigDefault = Object.keys(objDiff(QrCodeDefaults, qr.config)).length === 0;

	return {
		templateNameDialogOpen,
		setTemplateNameDialogOpen,
		shareDialogOpen,
		setShareDialogOpen,
		handleQrCodeDownload,
		handleContentFileDownload,
		handleCreateTemplate,
		showContentFileDownload,
		contentFileLabel,
		isConfigDefault,
	};
}
