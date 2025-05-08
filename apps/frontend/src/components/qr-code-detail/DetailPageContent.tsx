'use client';

import React, { Suspense, useCallback } from 'react';
import Container from '../ui/container';
import { Button } from '../ui/button';
import { ShareIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { DynamicQrCode } from '../qr-generator/DynamicQrCode';
import QrCodeDownloadBtn from '../qr-generator/QrCodeDownloadBtn';
import { AnalyticsSection } from '../dashboard/analytics/AnalyticsSection';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { UrlContent } from './content/Url';
import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { useToggleActiveStateMutation } from '@/lib/api/url-shortener';
import posthog from 'posthog-js';
import { toast } from '../ui/use-toast';

export const DetailPageContent = ({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) => {
	const t = useTranslations();
	const [isEditMode, setIsEditMode] = React.useState(false);
	const toggleMutation = useToggleActiveStateMutation();

	const renderQrCodeContent = () => {
		switch (qrCode?.content.type) {
			case 'url':
				return <UrlContent qrCode={qrCode} isEditMode={isEditMode} />;
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
			onError: () => {
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

	return (
		<Container className="mt-20">
			<div className="max-w-[1200px] mx-auto">
				<div className="flex justify-between items-center mb-4 px-4 pt-2">
					<div>
						{/* {isEditMode ? (
						<Input
							type="text"
							className="p-6 max-w-lg"
							placeholder="Enter a Name for your QRcode"
						/>
					) : (
						<h1 className="text-xl font-bold">Name XYZ</h1>
					)} */}
					</div>
					<div className="flex space-x-2">
						<Button variant="link" disabled>
							<ShareIcon className="h-6 w-6 mr-2" />
							Share
						</Button>
						<Button onClick={() => setIsEditMode(!isEditMode)}>
							{isEditMode ? 'View' : 'Edit'}
						</Button>
						<Button variant="destructive">Delete</Button>
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
