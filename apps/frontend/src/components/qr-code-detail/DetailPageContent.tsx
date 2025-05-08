'use client';

import React, { Suspense, useCallback, useEffect } from 'react';
import Container from '../ui/container';
import { Button } from '../ui/button';
import { ShareIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { DynamicQrCode } from '../qr-generator/DynamicQrCode';
import QrCodeDownloadBtn from '../qr-generator/QrCodeDownloadBtn';
import { AnalyticsSection } from '../dashboard/analytics/AnalyticsSection';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { UrlContent } from './content/Url';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { useToggleActiveStateMutation } from '@/lib/api/url-shortener';
import posthog from 'posthog-js';
import { toast } from '../ui/use-toast';
import { Input } from '../ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { QrCodeIcon } from '../dashboard/QrCodeIcon';
import { useDeleteQrCodeMutation, useUpdateQrCodeMutation } from '@/lib/api/qr-code';
import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
} from '../ui/alert-dialog';
import WifiContent from './content/Wifi';
import VCardContent from './content/VCard';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';

export const DetailPageContent = ({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) => {
	const t = useTranslations();
	const locale = useLocale();
	const [isEditMode, setIsEditMode] = React.useState(false);
	const [isDeleting, setIsDeleting] = React.useState(false);
	const toggleMutation = useToggleActiveStateMutation();
	const updateQrCodeMutation = useUpdateQrCodeMutation();
	const deleteMutation = useDeleteQrCodeMutation();

	const [qrCodeName, setQrCodeName] = React.useState(qrCode.name ?? '');
	const [debouncedQrCodeName] = useDebouncedValue<string | null>(qrCodeName, 500);

	const renderQrCodeContent = () => {
		switch (qrCode?.content.type) {
			case 'url':
				return <UrlContent qrCode={qrCode} isEditMode={isEditMode} />;
			case 'text':
				return (
					<div>
						<h2 className="mb-4 text-lg">{qrCode.content.data}</h2>
					</div>
				);
			case 'wifi':
				return <WifiContent qrCode={qrCode} />;
			case 'vCard':
				return <VCardContent qrCode={qrCode} />;
			default:
				return <></>;
		}
	};

	const handleToggle = useCallback(() => {
		if (!qrCode.shortUrl) return;

		toggleMutation.mutate(qrCode.shortUrl.shortCode, {
			onSuccess: () =>
				posthog.capture('short-url-toggled', {
					id: qrCode.shortUrl!.id,
					isActive: qrCode.shortUrl?.isActive,
				}),
			onError: (error) => {
				Sentry.captureException(error);
				toast({
					title: t('shortUrl.error.toggleActiveState.title'),
					description: t('shortUrl.error.toggleActiveState.message'),
					variant: 'destructive',
					duration: 5000,
				});

				if (qrCode.shortUrl) {
					qrCode.shortUrl.isActive = !qrCode.shortUrl.isActive;
				}
			},
		});
	}, [qrCode.shortUrl]);

	const router = useRouter();

	const handleDelete = useCallback(() => {
		setIsDeleting(true);
		deleteMutation.mutate(qrCode.id, {
			onSuccess: () => {
				router.push(`/${locale}/collection`);
			},
			onError: (error) => {
				setIsDeleting(false);
				Sentry.captureException(error);
				toast({
					title: t('qrCode.error.delete.title'),
					description: t('qrCode.error.delete.message'),
					variant: 'destructive',
				});
			},
		});
	}, [qrCode]);

	const handleUpdate = useCallback(() => {
		const oldName = qrCode.name;
		qrCode.name = debouncedQrCodeName;
		updateQrCodeMutation.mutate(
			{ qrCodeId: qrCode.id, data: { name: debouncedQrCodeName } },
			{
				onSuccess: () => {
					posthog.capture('qr-code-updated', {
						id: qrCode.id,
						data: {
							name: debouncedQrCodeName,
						},
					});
					toast({
						title: t('general.changesSaved'),
						duration: 2000,
						variant: 'success',
					});
				},
				onError: (error) => {
					qrCode.name = oldName;
					Sentry.captureException(error);
					toast({
						title: t('qrCode.error.update.title'),
						description: t('qrCode.error.update.message'),
						variant: 'destructive',
						duration: 5000,
					});
				},
			},
		);
	}, [qrCode.id, debouncedQrCodeName, updateQrCodeMutation]);

	useEffect(() => {
		if (debouncedQrCodeName && debouncedQrCodeName !== qrCode.name) {
			handleUpdate();
		}
	}, [debouncedQrCodeName]);

	return (
		<Container className="mt-20">
			<div className="max-w-[1200px] mx-auto">
				<div className="flex justify-between items-center mb-4 pr-4 pt-2">
					<div className="flex !space-x-4 items-center flex-1">
						<Link className="flex items-center space-x-2 pr-5" href={`/${locale}/collection`}>
							<ChevronLeftIcon className="w-5 h-5" /> <span>{t('general.back')}</span>
						</Link>
					</div>
					<div className="flex space-x-2">
						<Button variant="link" disabled>
							<ShareIcon className="h-6 w-6 mr-2" />
							{t('general.share')}
						</Button>
						<Button onClick={() => setIsEditMode(!isEditMode)}>
							{isEditMode ? t('general.view') : t('general.edit')}
						</Button>
						<AlertDialog>
							<AlertDialogTrigger className="cursor-pointer" asChild>
								<Button disabled={isDeleting} isLoading={isDeleting} variant="destructive">
									{t('general.delete')}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t('qrCode.confirmDeletePopup.title')}</AlertDialogTitle>
									<AlertDialogDescription>
										{t('qrCode.confirmDeletePopup.description')}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel asChild>
										<Button variant="secondary">{t('qrCode.confirmDeletePopup.cancelBtn')}</Button>
									</AlertDialogCancel>
									<Button
										variant="destructive"
										onClick={() => {
											handleDelete();
										}}
									>
										{t('qrCode.confirmDeletePopup.confirmBtn')}
									</Button>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
				<div className="px-4 py-5 sm:p-10 flex justify-between flex-1 overflow-hidden rounded-lg bg-white shadow mb-10 md:space-x-12">
					<div className="flex-1 max-w-[650px]">
						{qrCode?.shortUrl && (
							<Badge
								className="mb-6 group relative"
								variant={qrCode.shortUrl.isActive ? 'default' : 'outline'}
							>
								{qrCode.shortUrl.isActive
									? t('analytics.stateActive')
									: t('analytics.stateInactive')}
								<div className="ml-2 group-hover:block pointer-events-none group-hover:pointer-events-auto hidden">
									<Switch
										size="sm"
										checked={qrCode.shortUrl.isActive}
										onCheckedChange={() => {
											if (qrCode?.shortUrl) {
												qrCode.shortUrl.isActive = !qrCode.shortUrl.isActive;
												handleToggle();
											}
										}}
									/>
								</div>
							</Badge>
						)}

						<div className="flex !space-x-4 items-center flex-1 mb-6">
							<QrCodeIcon type={qrCode.content.type} />
							{isEditMode ? (
								<>
									<Input
										type="text"
										className="max-w-md"
										value={qrCodeName}
										placeholder={t('general.addName')}
										maxLength={32}
										onChange={(e) => {
											const newName = e.target.value;
											setQrCodeName(newName);
											if (debouncedQrCodeName !== newName) {
												posthog.capture('qr-code-name-changed', {
													id: qrCode.id,
													name: newName,
												});
											}
										}}
									/>
									<div className="px-2 py-1 text-sm text-gray-500">
										{qrCodeName.length}/32 {t('nameDialog.characters')}
									</div>
								</>
							) : (
								<h1 className="text-xl font-bold">
									{qrCode.name ?? (
										<span className="text-muted-foreground">{t('general.noName')}</span>
									)}
								</h1>
							)}
						</div>
						{renderQrCodeContent()}
					</div>
					<div>
						<Suspense fallback={null}>
							<div className="flex justify-center space-y-6 lg:flex-col lg:justify-start">
								{qrCode.previewImage ? (
									<Image
										src={qrCode.previewImage}
										width={300}
										height={300}
										alt="QR code preview"
										loading="lazy"
									/>
								) : (
									<DynamicQrCode
										qrCode={{
											content: qrCode.content,
											config: qrCode.config,
										}}
									/>
								)}
							</div>
							<div className="mt-6 flex justify-center lg:space-x-2 flex-col space-y-2 lg:space-y-0 lg:flex-row lg:justify-between">
								<QrCodeDownloadBtn
									qrCode={{
										name: qrCode.name,
										content: qrCode.content,
										config: qrCode.config,
									}}
									saveOnDownload={false}
								/>
							</div>
						</Suspense>
					</div>
				</div>

				{qrCode.shortUrl && <AnalyticsSection shortCode={qrCode.shortUrl.shortCode} />}
			</div>
		</Container>
	);
};
