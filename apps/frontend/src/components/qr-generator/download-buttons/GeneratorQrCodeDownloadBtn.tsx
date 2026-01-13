'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { type TFileExtension } from '@shared/schemas';
import { qrCodeQueryKeys, useCreateQrCodeMutation } from '@/lib/api/qr-code';
import { toast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { urlShortenerQueryKeys } from '@/lib/api/url-shortener';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';
import { useUser } from '@clerk/nextjs';
import {
	getQrCodeStylingOptions,
	isContentAtDefault,
	hasQrCodeChanged,
} from '@/lib/qr-code-helpers';

let QRCodeStyling: any;

/**
 * Download button for GENERATOR (creating new QR codes)
 * - Reads everything from context store
 * - Handles save-on-download logic
 * - Used in: main generator page
 */
export const GeneratorQrCodeDownloadBtn = ({
	saveOnDownload = false,
}: {
	saveOnDownload?: boolean;
}) => {
	const { isSignedIn } = useUser();
	const t = useTranslations('qrCode.download');
	const { name, config, content, shortUrl, latestQrCode, updateLatestQrCode, resetStore } =
		useQrCodeGeneratorStore((state) => state);

	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
	const [hasMounted, setHasMounted] = useState(false);
	const createQrCodeMutation = useCreateQrCodeMutation();
	const queryClient = useQueryClient();

	useEffect(() => {
		setHasMounted(true);

		import('qr-code-styling').then((module) => {
			QRCodeStyling = module.default;
			const options = getQrCodeStylingOptions(config, content, shortUrl);
			const instance = new QRCodeStyling(options);
			setQrCodeInstance(instance);
		});
	}, [config, content, shortUrl]);

	const onDownloadClick = async (fileExt: TFileExtension) => {
		if (!qrCodeInstance) return;

		const currentQrCode = { name: name || null, config, content };
		const hasChanged = hasQrCodeChanged(currentQrCode, latestQrCode);

		if (saveOnDownload && hasChanged) {
			try {
				const savedQrCode = await createQrCodeMutation.mutateAsync(
					{ name: name || null, config, content },
					{
						onSuccess: (data) => {
							if (data.createdBy) {
								toast({
									title: t('successTitle'),
									description: t('successDescription'),
									duration: 5000,
								});

								void Promise.all([
									queryClient.invalidateQueries({ queryKey: qrCodeQueryKeys.listQrCodes }),
									queryClient.invalidateQueries({
										queryKey: urlShortenerQueryKeys.reservedShortUrl,
									}),
								]);

								if (content.type === 'url' && content.data.isEditable) {
									resetStore();
								}

								updateLatestQrCode({ name: name || null, config, content });
							}
							posthog.capture('qr-code-created', { data: content });
						},
						onError: (e: Error) => {
							const error = e as ApiError;

							if (error.code >= 500) {
								Sentry.captureException(error, {
									extra: {
										qrCode: { config, content },
										error: {
											code: error.code,
											message: error.message,
											fieldErrors: error?.fieldErrors,
										},
									},
								});

								posthog.capture('error:qr-code-created', {
									qrCode: { config, content },
									error: {
										code: error.code,
										message: error.message,
										fieldErrors: error?.fieldErrors,
									},
								});
							}

							if (isSignedIn) {
								toast({
									variant: 'destructive',
									title: t('errorTitle'),
									description: error.message,
									duration: 5000,
								});
							}
						},
					},
				);

				// If the saved QR code has a short URL, update the instance before downloading
				if (savedQrCode?.shortUrl) {
					const updatedOptions = getQrCodeStylingOptions(config, content, savedQrCode.shortUrl);
					qrCodeInstance.update(updatedOptions);
				}
			} catch {
				// silent catch - error already handled in onError
			}
		}

		await qrCodeInstance.download({
			name: 'qr-code',
			extension: fileExt,
		});
	};

	const isDisabled =
		!hasMounted ||
		isContentAtDefault(content, isSignedIn === true) ||
		createQrCodeMutation.isPending;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={isDisabled}>
				<Button isLoading={createQrCodeMutation.isPending} disabled={isDisabled}>
					{t('downloadBtn')}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuItem className="cursor-pointer" onClick={() => onDownloadClick('svg')}>
						<span>SVG</span>
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer" onClick={() => onDownloadClick('jpeg')}>
						<span>JPG</span>
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer" onClick={() => onDownloadClick('webp')}>
						<span>WEBP</span>
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer" onClick={() => onDownloadClick('png')}>
						<span>PNG</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
