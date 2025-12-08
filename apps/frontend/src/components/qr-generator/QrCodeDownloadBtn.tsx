/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
'use client';

import { Button } from '../ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
	getDefaultContentByType,
	type TCreateQrCodeDto,
	type TFileExtension,
} from '@shared/schemas';
import { qrCodeQueryKeys, useCreateQrCodeMutation } from '@/lib/api/qr-code';
import { toast } from '../ui/use-toast';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { urlShortenerQueryKeys } from '@/lib/api/url-shortener';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import * as Sentry from '@sentry/nextjs';

let QRCodeStyling: any;

const QrCodeDownloadBtn = ({
	qrCode,
	saveOnDownload = false,
	noStyling = false,
}: {
	qrCode: TCreateQrCodeDto;
	saveOnDownload?: boolean;
	noStyling?: boolean;
}) => {
	const t = useTranslations('qrCode.download');
	const { content, updateContent } = useQrCodeGeneratorStore((state) => state);
	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
	const [hasMounted, setHasMounted] = useState(false);
	const createQrCodeMutation = useCreateQrCodeMutation();
	const { latestQrCode, updateLatestQrCode } = useQrCodeGeneratorStore((state) => state);
	const queryClient = useQueryClient();

	useEffect(() => {
		setHasMounted(true);

		import('qr-code-styling').then((module) => {
			QRCodeStyling = module.default;
			const instance = new QRCodeStyling({
				...convertQrCodeOptionsToLibraryOptions(qrCode.config),
				data: convertQRCodeDataToStringByType(qrCode.content),
			});
			setQrCodeInstance(instance);
		});
	}, [qrCode]);

	const onDownloadClick = async (fileExt: TFileExtension) => {
		if (!qrCodeInstance) return;

		const hasChanged =
			JSON.stringify(qrCode.content) !== JSON.stringify(latestQrCode?.content) ||
			JSON.stringify(qrCode.config) !== JSON.stringify(latestQrCode?.config);

		if (saveOnDownload && hasChanged) {
			try {
				await createQrCodeMutation.mutateAsync(qrCode, {
					onSuccess: (data) => {
						if (data.success && data.isStored) {
							toast({
								title: t('successTitle'),
								description: t('successDescription'),
								duration: 5000,
							});

							if (content.type === 'url' && content.data.isEditable) {
								updateContent({
									type: 'url',
									data: {
										url: '',
										isEditable: false,
									},
								});
							}

							updateLatestQrCode({
								config: qrCode.config,
								content: qrCode.content,
							});

							void Promise.all([
								queryClient.invalidateQueries({ queryKey: qrCodeQueryKeys.listQrCodes }),
								queryClient.invalidateQueries({ queryKey: urlShortenerQueryKeys.reservedShortUrl }),
							]);
						}
					},
					onError: (e) => {
						Sentry.captureException(e, {
							data: {
								qrCode: qrCode,
								error: e.message,
							},
						});
						toast({
							variant: 'destructive',
							title: t('errorTitle'),
							description: e.message,
							duration: 5000,
						});

						posthog.capture('error:qr-code-created', { qrCode, error: e });
					},
				});

				posthog.capture('qr-code-created', {
					data: qrCode.content,
				});
			} catch {
				// silent catch
			}
		}

		await qrCodeInstance.download({
			name: 'qr-code',
			extension: fileExt,
		});
	};

	const isDisabled =
		!hasMounted ||
		JSON.stringify(qrCode.content) ===
			JSON.stringify(getDefaultContentByType(qrCode.content.type)) ||
		createQrCodeMutation.isPending;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={isDisabled}>
				{noStyling ? (
					<div className={`cursor-pointer ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
						Download
					</div>
				) : (
					<Button isLoading={createQrCodeMutation.isPending} disabled={isDisabled}>
						{t('downloadBtn')}
					</Button>
				)}
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

export default QrCodeDownloadBtn;
