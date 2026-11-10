'use client';

import { useState } from 'react';
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
import { useDownloadQrCode } from '@/hooks/use-download-qr-code';

export function useQrCodeActionHandlers(qr: TQrCodeWithRelationsResponseDto) {
	const t = useTranslations();
	const downloadQrCode = useDownloadQrCode();
	const tTemplates = useTranslations('templates');
	const [templateNameDialogOpen, setTemplateNameDialogOpen] = useState(false);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const createConfigTemplateMutation = useCreateConfigTemplateMutation();
	const { trackAction } = useBehaviorTracker();

	const handleQrCodeDownload = async (fileExt: TFileExtension) => {
		posthog.capture('dashboard.qr-code-download', {
			qrCode: qr.id,
			name: qr.name || 'qr-code',
			extension: fileExt,
		});
		trackAction('qr-download');

		const options = getQrCodeStylingOptions(qr.config, qr.content, {
			qrCodeData: qr.qrCodeData,
			shortUrl: qr.shortUrl || undefined,
		});
		await downloadQrCode(options, qr.name || 'qr-code', fileExt);
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
				} catch {
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

						if (error.code === 0 || error.code >= 500) {
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
		} catch {}
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
