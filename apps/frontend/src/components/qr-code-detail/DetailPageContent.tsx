'use client';

import React, { Suspense, useCallback } from 'react';
import Container from '../ui/container';
import { Button, buttonVariants } from '../ui/button';
import { ShareIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { DynamicQrCode } from '../qr-generator/DynamicQrCode';
import { SavedQrCodeDownloadBtn } from '../qr-generator/download-buttons';
import { AnalyticsSection } from './analytics/AnalyticsSection';
import type { TQrCodeWithRelationsResponseDto, TShortUrl } from '@shared/schemas';
import { UrlContent } from './content/Url';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { toast } from '../ui/use-toast';
import { QrCodeIcon } from '../dashboard/qrCode/QrCodeIcon';
import { useDeleteQrCodeMutation } from '@/lib/api/qr-code';
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
import EmailContent from './content/Email';
import LocationContent from './content/Location';
import EventContent from './content/Event';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { getQrCodeEditLink } from '@/lib/utils';
import type { SupportedLanguages } from '@/i18n/routing';

export const DetailPageContent = ({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) => {
	const t = useTranslations();
	const locale = useLocale() as SupportedLanguages;
	const [isDeleting, setIsDeleting] = React.useState(false);
	const deleteMutation = useDeleteQrCodeMutation();

	const renderQrCodeContent = () => {
		switch (qrCode?.content.type) {
			case 'url':
				return <UrlContent qrCode={qrCode} />;
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
			case 'email':
				return <EmailContent qrCode={qrCode} />;
			case 'location':
				return <LocationContent qrCode={qrCode} />;
			case 'event':
				return <EventContent qrCode={qrCode} />;
			default:
				return <></>;
		}
	};

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

	return (
		<Container className="mt-20">
			<div className="max-w-[1200px] mx-auto">
				<div className="flex justify-between items-center mb-4 pr-4 pt-2">
					<div className="flex !space-x-4 items-center flex-1">
						<Link className="flex items-center space-x-2 pr-5" href={`/${locale}/collection`}>
							<ChevronLeftIcon className="w-5 h-5" />{' '}
							<span className="hidden sm:block">{t('general.backToOverview')}</span>
						</Link>
					</div>
					<div className="flex space-x-2">
						<Button variant="link" disabled className="hidden">
							<ShareIcon className="h-6 w-6 mr-2" />
							{t('general.share')}
						</Button>
						<Link className={buttonVariants()} href={getQrCodeEditLink(locale, qrCode.id)}>
							{t('general.edit')}
						</Link>
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
				<div className="px-4 py-5 sm:p-10 md:flex justify-between flex-1 overflow-hidden rounded-lg bg-white shadow mb-10 md:space-x-12">
					<div className="flex-1 max-w-[650px] mb-10 md:mb-0">
						{qrCode?.shortUrl && (
							<Badge
								className="mb-6 group relative"
								variant={qrCode.shortUrl.isActive ? 'default' : 'outline'}
							>
								{qrCode.shortUrl.isActive
									? t('analytics.stateActive')
									: t('analytics.stateInactive')}
							</Badge>
						)}

						<div className="flex !space-x-4 items-center flex-1 mb-6">
							<QrCodeIcon type={qrCode.content.type} />
							<h1 className="text-xl font-semibold">
								{qrCode.name ?? (
									<span className="text-muted-foreground">{t('general.noName')}</span>
								)}
							</h1>
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
										className="max-h-[200px] max-w-[200px] lg:max-h-[300px] lg:max-w-[300px]"
										alt="QR code preview"
										loading="lazy"
									/>
								) : (
									<DynamicQrCode
										qrCode={{
											content: qrCode.content,
											config: qrCode.config,
										}}
										shortUrl={qrCode.shortUrl as TShortUrl | undefined}
									/>
								)}
							</div>
							<div className="mt-6 flex justify-center lg:space-x-2 flex-col space-y-2 lg:space-y-0 lg:flex-row lg:justify-between">
								<SavedQrCodeDownloadBtn qrCode={qrCode} />
							</div>
						</Suspense>
					</div>
				</div>

				{qrCode.shortUrl && <AnalyticsSection shortCode={qrCode.shortUrl.shortCode} />}
			</div>
		</Container>
	);
};
