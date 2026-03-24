'use client';

import React, { Suspense, useCallback } from 'react';
import { Button, buttonVariants } from '../ui/button';
import { ShareDialog } from '../qr-code-share/ShareDialog';
import Image from 'next/image';
import { DynamicQrCode } from '../qr-generator/DynamicQrCode';
import { SavedQrCodeDownloadBtn } from '../qr-generator/download-buttons';
import { AnalyticsSection } from './analytics/AnalyticsSection';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { UrlContent } from './content/Url';
import { useTranslations } from 'next-intl';
import { toast } from '../ui/use-toast';
import { QrCodeIcon } from '../dashboard/qrCode/QrCodeIcon';
import { QrCodeTagBadges } from '../dashboard/qrCode/QrCodeTagBadges';
import { useDeleteQrCodeMutation } from '@/lib/api/qr-code';
import * as Sentry from '@sentry/nextjs';
import { useRouter } from '@/i18n/navigation';
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
import EpcContent from './content/Epc';
import TextContent from './content/Text';
import { Link } from '@/i18n/navigation';
import { getQrCodeEditLink } from '@/lib/utils';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

import { Card, CardContent } from '../ui/card';
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from '../ui/breadcrumb';

export const DetailPageContent = ({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) => {
	const t = useTranslations();

	const [isDeleting, setIsDeleting] = React.useState(false);
	const deleteMutation = useDeleteQrCodeMutation();

	const renderQrCodeContent = () => {
		switch (qrCode?.content.type) {
			case 'url':
				return <UrlContent qrCode={qrCode} />;
			case 'text':
				return <TextContent qrCode={qrCode} />;
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
			case 'epc':
				return <EpcContent qrCode={qrCode} />;
			default:
				return <></>;
		}
	};

	const router = useRouter();

	const handleDelete = useCallback(() => {
		setIsDeleting(true);
		deleteMutation.mutate(qrCode.id, {
			onSuccess: () => {
				router.push('/dashboard/qr-codes');
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [qrCode]);

	return (
		<>
			{/* Header Card */}
			<Card className="@container/card">
				<CardContent className="px-4 sm:px-6">
					<Breadcrumb className="mb-4">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/dashboard/qr-codes">{t('collection.tabQrCode')}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{qrCode.name || t('general.noName')}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="p-2.5 sm:p-3 bg-primary/10 rounded-lg shrink-0">
								<QrCodeIcon type={qrCode.content.type} className="size-5 sm:size-8 stroke-1" />
							</div>
							<div>
								<h1 className="text-base sm:text-lg font-semibold break-words leading-snug">
									{qrCode.name || (
										<span className="text-muted-foreground">{t('general.noName')}</span>
									)}
								</h1>
								{/* {qrCode.shortUrl && (
									<Badge
										variant={qrCode.shortUrl.isActive ? 'default' : 'outline'}
										className="mt-1"
									>
										{qrCode.shortUrl.isActive
											? t('analytics.stateActive')
											: t('analytics.stateInactive')}
									</Badge>
								)} */}
								<QrCodeTagBadges qrCodeId={qrCode.id} tags={qrCode.tags ?? []} />
							</div>
						</div>
						<div className="flex items-center gap-2">
							<ShareDialog qrCodeId={qrCode.id} />
							<Link className={buttonVariants({ size: 'sm' })} href={getQrCodeEditLink(qrCode.id)}>
								<PencilIcon className="size-4 lg:hidden" />
								<span className="hidden lg:inline">{t('general.edit')}</span>
							</Link>
							<AlertDialog>
								<AlertDialogTrigger className="cursor-pointer" asChild>
									<Button
										disabled={isDeleting}
										isLoading={isDeleting}
										variant="destructive"
										size="sm"
									>
										<TrashIcon className="size-4 lg:hidden" />
										<span className="hidden lg:inline">{t('general.delete')}</span>
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
											<Button variant="secondary">
												{t('qrCode.confirmDeletePopup.cancelBtn')}
											</Button>
										</AlertDialogCancel>
										<Button
											variant="destructive"
											disabled={isDeleting}
											isLoading={isDeleting}
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
				</CardContent>
			</Card>

			{/* Content Card */}
			<Card>
				<CardContent className="px-4 sm:px-6">
					<div className="md:flex md:gap-8">
						<div className="flex-1 min-w-0 mb-6 md:mb-0">{renderQrCodeContent()}</div>
						<div className="shrink-0">
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
											unoptimized
										/>
									) : (
										<DynamicQrCode
											qrCode={{
												content: qrCode.content,
												config: qrCode.config,
												qrCodeData: qrCode.qrCodeData,
											}}
											shortUrl={qrCode.shortUrl || undefined}
										/>
									)}
								</div>
								<div className="mt-4 flex justify-center">
									<SavedQrCodeDownloadBtn qrCode={qrCode} />
								</div>
							</Suspense>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Analytics */}
			{qrCode.shortUrl && <AnalyticsSection shortCode={qrCode.shortUrl.shortCode} />}
		</>
	);
};
