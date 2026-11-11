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
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { getQrCodeStylingOptions } from '@/lib/qr-code-helpers';
import { useDownloadQrCode } from '@/hooks/use-download-qr-code';

/**
 * Download button for EDITOR (editing existing QR codes)
 * - Uses context store for current config (styling)
 * - Uses stored qrCodeData from initialQrCode (has correct custom domain)
 * - Downloads current edited styling version
 * - Used in: edit pages
 */
export const EditorQrCodeDownloadBtn = ({
	initialQrCode,
}: {
	initialQrCode: TQrCodeWithRelationsResponseDto;
}) => {
	const t = useTranslations('qrCode.download');
	const downloadQrCode = useDownloadQrCode();
	const { config, content } = useQrCodeGeneratorStore((state) => state);

	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const onDownloadClick = async (fileExt: TFileExtension) => {
		// Use stored qrCodeData from the saved QR code (has correct custom domain baked in)
		// Config/styling comes from context store for live preview
		const options = getQrCodeStylingOptions(config, content, {
			qrCodeData: initialQrCode.qrCodeData,
		});
		await downloadQrCode(options, initialQrCode.name || 'qr-code', fileExt);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={!hasMounted}>
				<Button disabled={!hasMounted}>{t('downloadBtn')}</Button>
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
