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
import { useDownloadQrCode } from '@/hooks/use-download-qr-code';

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
	const downloadQrCode = useDownloadQrCode();
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const onDownloadClick = async (fileExt: TFileExtension) => {
		const options = getQrCodeStylingOptions(qrCode.config, qrCode.content, {
			qrCodeData: qrCode.qrCodeData,
		});
		await downloadQrCode(options, qrCode.name || 'qr-code', fileExt);
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
