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

let QRCodeStyling: any;

/**
 * Download button for EDITOR (editing existing QR codes)
 * - Uses context store for current state
 * - No save logic (separate update button)
 * - Downloads current edited version
 * - Used in: edit pages
 */
export const EditorQrCodeDownloadBtn = ({
	initialQrCode,
}: {
	initialQrCode: TQrCodeWithRelationsResponseDto;
}) => {
	const t = useTranslations('qrCode.download');
	const { config, content, shortUrl } = useQrCodeGeneratorStore((state) => state);

	const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);

		import('qr-code-styling').then((module) => {
			QRCodeStyling = module.default;
			// Use current state from context (edited version)
			const options = getQrCodeStylingOptions(config, content, shortUrl);
			const instance = new QRCodeStyling(options);
			setQrCodeInstance(instance);
		});
	}, [config, content, shortUrl]);

	const onDownloadClick = async (fileExt: TFileExtension) => {
		if (!qrCodeInstance) return;

		await qrCodeInstance.download({
			name: initialQrCode.name || 'qr-code',
			extension: fileExt,
		});
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
