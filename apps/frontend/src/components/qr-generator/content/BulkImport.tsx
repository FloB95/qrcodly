'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import type { TQrCodeContentType } from '@shared/schemas';
import { ArrowDownTrayIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useTranslations } from 'next-intl';
import { FileUploader } from '@/components/FileUploader';
import { useBulkCreateQrCodeMutation } from '@/lib/api/qr-code';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { LoginRequiredDialog } from '../LoginRequiredDialog';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';

type BulkImportProps = {
	contentType: TQrCodeContentType;
};

export const BulkImport = ({ contentType }: BulkImportProps) => {
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const { config, bulkMode, updateBulkMode } = useQrCodeGeneratorStore((state) => state);
	const t = useTranslations('generator.bulkImport');

	const bulkCreateQrCodeMutation = useBulkCreateQrCodeMutation();

	const handleSave = async () => {
		if (!bulkMode.file) return;

		try {
			await bulkCreateQrCodeMutation.mutateAsync(
				{
					config,
					contentType,
					file: bulkMode.file,
				},
				{
					onSuccess: () => {
						toast({
							title: t('successTitle'),
							description: t('successDescription'),
							duration: 5000,
							action: (
								<Link href="/collection" className={buttonVariants({ variant: 'secondary' })}>
									Zur Sammlung
								</Link>
							),
						});

						// void Promise.all([
						// 	queryClient.invalidateQueries({ queryKey: qrCodeQueryKeys.listQrCodes }),
						// 	queryClient.invalidateQueries({ queryKey: urlShortenerQueryKeys.reservedShortUrl }),
						// ]);

						// if (qrCode.content.type === 'url' && qrCode.content.data.isEditable) {
						// 	resetStore();
						// }

						// updateLatestQrCode({
						// 	config: qrCode.config,
						// 	content: qrCode.content,
						// });

						// posthog.capture('qr-code-created', {
						// 	qrCodeName: qrCodeName,
						// });
					},
					onError: (e: any) => {
						// Sentry.captureException(e, {
						// 	data: {
						// 		qrCodeName: qrCodeName,
						// 		config: qrCode.config,
						// 		content: qrCode.content,
						// 		error: {
						// 			message: e.message,
						// 			fieldErrors: e?.fieldErrors,
						// 		},
						// 	},
						// });
						toast({
							variant: 'destructive',
							title: t('download.errorTitle'),
							description: e.message,
							duration: 5000,
						});

						// posthog.capture('error:qr-code-created', {
						// 	qrCodeName: qrCodeName,
						// 	config: qrCode.config,
						// 	content: qrCode.content,
						// 	error: {
						// 		message: e.message,
						// 		fieldErrors: e?.fieldErrors,
						// 	},
						// });
					},
				},
			);
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<div>
			<p className="font-bold text-xl mb-4">{t('title')}</p>
			<div className="flex gap-3 flex-col">
				<Item variant="outline">
					<ItemContent>
						<ItemTitle>{t('step1.title')}</ItemTitle>
						<ItemDescription>{t('step1.description')}</ItemDescription>
					</ItemContent>
				</Item>

				<Item variant="outline">
					<ItemContent>
						<ItemTitle>{t('step2.title', { contentType })}</ItemTitle>
						<ItemDescription>{t('step2.description', { contentType })}</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Button variant="outline" size="sm">
							{t('step2.button')} <ArrowDownTrayIcon className="w-4 h-4 ml-2" />
						</Button>
					</ItemActions>
				</Item>

				<Item variant="outline">
					<ItemContent>
						<ItemTitle>{t('step3.title')}</ItemTitle>
						<ItemDescription>{t('step3.description')}</ItemDescription>
					</ItemContent>
				</Item>

				<FileUploader
					value={bulkMode.file ? [bulkMode.file] : []}
					onValueChange={(files) => updateBulkMode(true, files[0])}
					maxFiles={1}
					accept="text/csv"
				/>

				<Item variant="outline">
					<InformationCircleIcon className="w-8 h-8 text-blue-500" />
					<ItemContent>
						<ItemTitle>{t('info.title')}</ItemTitle>
						<ItemDescription>{t('info.description')}</ItemDescription>
					</ItemContent>
				</Item>

				<div className="mt-2">
					<Button
						isLoading={bulkCreateQrCodeMutation.isPending}
						disabled={!bulkMode.file || bulkCreateQrCodeMutation.isPending}
						onClick={() => {
							if (!isSignedIn) {
								setAlertOpen(true);
								return;
							}
							handleSave();
						}}
					>
						{t('createButton')}
					</Button>
				</div>
			</div>
			<LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />
		</div>
	);
};
