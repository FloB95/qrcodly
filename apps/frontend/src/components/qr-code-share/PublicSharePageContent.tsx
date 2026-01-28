'use client';

import React from 'react';
import Image from 'next/image';
import { DynamicQrCode } from '../qr-generator/DynamicQrCode';
import type {
	TPublicSharedQrCodeResponseDto,
	TQrCodeWithRelationsResponseDto,
} from '@shared/schemas';
import { QrCodeIcon } from '../dashboard/qrCode/QrCodeIcon';
import { SavedQrCodeDownloadBtn } from '../qr-generator/download-buttons/SavedQrCodeDownloadBtn';
import { useTranslations } from 'next-intl';

interface PublicSharePageContentProps {
	sharedQrCode: TPublicSharedQrCodeResponseDto;
}

export function PublicSharePageContent({ sharedQrCode }: PublicSharePageContentProps) {
	const tContent = useTranslations('generator.contentSwitch.tab');
	const { name, content, config, shareConfig, previewImage, qrCodeData } = sharedQrCode;

	// Create a compatible object for SavedQrCodeDownloadBtn
	const qrCodeCompat =
		content && qrCodeData
			? ({
					name,
					content,
					config,
					qrCodeData,
				} as TQrCodeWithRelationsResponseDto)
			: null;

	// Get display label: use name if available, otherwise use content type label
	const displayLabel = name || (content ? tContent(content.type) : null);

	return (
		<div className="flex flex-col items-center justify-center">
			{/* White Box with QR Code - Always displayed */}
			<div className="w-full max-w-2xl rounded-2xl from-white to-white/60 bg-gradient-to-br relative p-6 sm:p-8">
				<div className="flex flex-col items-center">
					{/* Name/Type label inside the white box */}
					{shareConfig.showName && displayLabel && content && (
						<div className="flex items-center mb-4">
							<QrCodeIcon type={content.type} />
							<span className="text-sm sm:text-lg font-medium">{displayLabel}</span>
						</div>
					)}

					<div className="max-h-[300px] max-w-[300px]">
						{previewImage ? (
							<Image
								src={previewImage}
								width={300}
								height={300}
								className="h-full w-full object-contain"
								alt="QR code"
								priority
							/>
						) : (
							content && (
								<DynamicQrCode
									qrCode={{
										content,
										config,
									}}
								/>
							)
						)}
					</div>

					{shareConfig.showDownloadButton && qrCodeCompat && (
						<div className="mt-6">
							<SavedQrCodeDownloadBtn qrCode={qrCodeCompat} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
