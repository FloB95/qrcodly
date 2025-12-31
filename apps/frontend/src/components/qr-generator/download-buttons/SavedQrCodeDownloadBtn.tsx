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
import { type TFileExtension, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';
import { getQrCodeStylingOptions } from '@/lib/qr-code-helpers';

let QRCodeStyling: any;

/**
 * Download button for SAVED QR codes (from database)
 * - Simple, no mutation logic
 * - All data comes from props
 * - Used in: list view, detail view, dashboard
 */
export const SavedQrCodeDownloadBtn = ({
	qrCode,
	noStyling = false,
}: {
	qrCode: TQrCodeWithRelationsResponseDto;
	noStyling?: boolean;
}) => {
	const t = useTranslations('qrCode.download');
	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);

		import('qr-code-styling').then((module) => {
			QRCodeStyling = module.default;
			const options = getQrCodeStylingOptions(
				qrCode.config,
				qrCode.content,
				qrCode.shortUrl || undefined,
			);
			const instance = new QRCodeStyling(options);
			setQrCodeInstance(instance);
		});
	}, [qrCode.config, qrCode.content, qrCode.shortUrl]);

	const onDownloadClick = async (fileExt: TFileExtension) => {
		if (!qrCodeInstance) return;

		await qrCodeInstance.download({
			name: qrCode.name || 'qr-code',
			extension: fileExt,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={!hasMounted}>
				{noStyling ? (
					<div className={`cursor-pointer ${!hasMounted ? 'opacity-50 pointer-events-none' : ''}`}>
						{t('downloadBtn')}
					</div>
				) : (
					<Button disabled={!hasMounted}>{t('downloadBtn')}</Button>
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
