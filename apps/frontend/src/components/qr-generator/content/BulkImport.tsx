'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import type { TQrCodeContentType } from '@shared/schemas';
import { ArrowDownTrayIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useLocale, useTranslations } from 'next-intl';
import { FileUploader } from '@/components/FileUploader';
import { qrCodeQueryKeys, useBulkCreateQrCodeMutation } from '@/lib/api/qr-code';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { LoginRequiredDialog } from '../LoginRequiredDialog';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import type { ApiError } from '@/lib/api/ApiError';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { urlShortenerQueryKeys } from '@/lib/api/url-shortener';
import { motion, AnimatePresence } from 'framer-motion';

type BulkImportProps = {
	contentType: TQrCodeContentType;
};

export const BulkImport = ({ contentType }: BulkImportProps) => {
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [isUploaded, setIsUploaded] = useState(false);
	const { config, bulkMode, updateBulkMode } = useQrCodeGeneratorStore((state) => state);
	const t = useTranslations();
	const queryClient = useQueryClient();
	const locale = useLocale();
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
						scrollTo({
							top: 200,
							behavior: 'smooth',
						});
						setTimeout(() => {
							setIsUploaded(true);
						}, 500);

						void Promise.all([
							queryClient.invalidateQueries({ queryKey: qrCodeQueryKeys.listQrCodes }),
							queryClient.invalidateQueries({ queryKey: urlShortenerQueryKeys.reservedShortUrl }),
						]);

						posthog.capture('qr-code-bulk-import', {
							contentType,
							file: bulkMode.file?.name,
						});
					},
					onError: (e: any) => {
						const error = e as ApiError;

						if (error.code >= 500) {
							Sentry.captureException(error, {
								data: {
									error: {
										code: error.code,
										message: error.message,
										fieldErrors: error?.fieldErrors,
									},
								},
							});

							posthog.capture('error:qr-code-bulk-import', {
								error: {
									code: error.code,
									message: error.message,
									fieldErrors: error?.fieldErrors,
								},
							});
						}

						toast({
							variant: 'destructive',
							title: t('generator.bulkImport.errorTitle'),
							description: error.message,
							duration: 5000,
						});
					},
				},
			);
		} catch (error) {}
	};

	return (
		<div className="relative">
			<AnimatePresence>
				{isUploaded && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="flex flex-col items-center justify-center p-6 mt-4"
					>
						<motion.svg
							width="50"
							height="50"
							viewBox="0 0 120 120"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<circle
								cx="60"
								cy="60"
								r="54"
								stroke="#34D399"
								strokeWidth="8"
								className="stroke-current text-green-500"
							/>
							<motion.path
								d="M40 60 L55 75 L80 45"
								stroke="#34D399"
								strokeWidth="10"
								strokeLinecap="round"
								strokeLinejoin="round"
								initial={{ pathLength: 0 }}
								animate={{ pathLength: 1 }}
								transition={{ duration: 0.5, ease: 'easeInOut' }}
							/>
						</motion.svg>

						<h3 className="mt-4 text-lg sm:text-2xl font-bold">
							{t('generator.bulkImport.successTitle')}
						</h3>
						<p className="mt-2 text-center">{t('generator.bulkImport.successDescription')}</p>
						<div className="flex gap-2 mt-4">
							<Link href="/collection" className={buttonVariants()}>
								{t('general.toCollection')}
							</Link>
							<Button variant="outlineStrong" onClick={() => updateBulkMode(false, undefined)}>
								{t('general.back')}
							</Button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{!isUploaded && (
				<>
					<h3 className="font-bold text-xl mb-4">
						{t('generator.bulkImport.title', {
							contentType: t('generator.contentSwitch.tab.' + contentType),
						})}
					</h3>
					<div className="flex gap-3 flex-col">
						<Item variant="outline">
							<ItemContent>
								<ItemTitle>{t('generator.bulkImport.step1.title')}</ItemTitle>
								<ItemDescription>{t('generator.bulkImport.step1.description')}</ItemDescription>
							</ItemContent>
						</Item>

						<Item variant="outline">
							<ItemContent>
								<ItemTitle>
									{t('generator.bulkImport.step2.title', {
										contentType: t('generator.contentSwitch.tab.' + contentType),
									})}
								</ItemTitle>
								<ItemDescription>
									{t('generator.bulkImport.step2.description', {
										contentType: t('generator.contentSwitch.tab.' + contentType),
									})}
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<Link
									href={`/csv-templates/qrcodly-import-${contentType.toLocaleLowerCase()}-${locale}.csv`}
									title={t('generator.bulkImport.step2.button')}
									className={buttonVariants({ variant: 'outline', size: 'sm' })}
								>
									{t('generator.bulkImport.step2.button')}{' '}
									<ArrowDownTrayIcon className="w-4 h-4 ml-2" />
								</Link>
							</ItemActions>
						</Item>

						<Item variant="outline">
							<ItemContent>
								<ItemTitle>{t('generator.bulkImport.step3.title')}</ItemTitle>
								<ItemDescription>{t('generator.bulkImport.step3.description')}</ItemDescription>
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
								<ItemTitle>{t('generator.bulkImport.info.title')}</ItemTitle>
								<ItemDescription>{t('generator.bulkImport.info.description')}</ItemDescription>
							</ItemContent>
						</Item>

						<div className="mt-2 justify-between space-x-2 space-y-2 xs:flex">
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
								{t('generator.bulkImport.createButton')}
							</Button>
							<Button variant="outlineStrong" onClick={() => updateBulkMode(false, undefined)}>
								{t('general.back')}
							</Button>
						</div>
					</div>
				</>
			)}
			<LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />
		</div>
	);
};
