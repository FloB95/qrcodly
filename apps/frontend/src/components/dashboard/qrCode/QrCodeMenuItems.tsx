'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { TQrCodeWithRelationsResponseDto, TFileExtension } from '@shared/schemas';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface MenuComponents {
	Item: ComponentType<any>;
	Label: ComponentType<any>;
	Separator: ComponentType<any>;
	Sub: ComponentType<any>;
	SubTrigger: ComponentType<any>;
	SubContent: ComponentType<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface QrCodeMenuItemsActionProps {
	qr: TQrCodeWithRelationsResponseDto;
	onShare: () => void;
	onDownloadQrCode: (ext: TFileExtension) => Promise<void>;
	onDownloadContentFile: () => void;
	onToggle: () => void;
	onSaveAsTemplate: () => void;
	onDelete: () => void;
	showContentFileDownload: boolean;
	contentFileLabel: string;
	isConfigDefault: boolean;
}

interface QrCodeMenuItemsProps extends QrCodeMenuItemsActionProps {
	components: MenuComponents;
}

export const QrCodeMenuItems = ({
	components: { Item, Label, Separator, Sub, SubTrigger, SubContent },
	qr,
	onShare,
	onDownloadQrCode,
	onDownloadContentFile,
	onToggle,
	onSaveAsTemplate,
	onDelete,
	showContentFileDownload,
	contentFileLabel,
	isConfigDefault,
}: QrCodeMenuItemsProps) => {
	const t = useTranslations();
	const tTemplates = useTranslations('templates');

	return (
		<>
			<Label>{t('qrCode.actionsMenu.title')}</Label>
			<Separator />

			<Item asChild>
				<Link className="cursor-pointer" href={`/dashboard/qr-codes/${qr.id}`}>
					{t('qrCode.actionsMenu.view')}
				</Link>
			</Item>

			<Item asChild>
				<Link className="cursor-pointer" href={`/dashboard/qr-codes/${qr.id}/edit`}>
					{t('qrCode.actionsMenu.edit')}
				</Link>
			</Item>

			<Item onClick={() => onShare()} className="cursor-pointer">
				{t('general.share')}
			</Item>

			{/* Download with submenu */}
			<Sub>
				<SubTrigger>{t('qrCode.download.downloadBtn')}</SubTrigger>
				<SubContent>
					{/* QR Code formats - nested submenu */}
					<Sub>
						<SubTrigger>QR Code</SubTrigger>
						<SubContent>
							<Item className="cursor-pointer" onClick={() => void onDownloadQrCode('svg')}>
								SVG
							</Item>
							<Item className="cursor-pointer" onClick={() => void onDownloadQrCode('jpeg')}>
								JPG
							</Item>
							<Item className="cursor-pointer" onClick={() => void onDownloadQrCode('webp')}>
								WEBP
							</Item>
							<Item className="cursor-pointer" onClick={() => void onDownloadQrCode('png')}>
								PNG
							</Item>
						</SubContent>
					</Sub>

					{/* Content file download for vCard/Event */}
					{showContentFileDownload && (
						<Item className="cursor-pointer" onClick={() => onDownloadContentFile()}>
							{contentFileLabel}
						</Item>
					)}
				</SubContent>
			</Sub>

			{qr.shortUrl && (
				<Item onClick={() => onToggle()} className="cursor-pointer">
					{qr.shortUrl.isActive
						? t('qrCode.actionsMenu.disableShortUrl')
						: t('qrCode.actionsMenu.enableShortUrl')}
				</Item>
			)}

			{!isConfigDefault && (
				<Item onClick={() => onSaveAsTemplate()} className="cursor-pointer">
					{tTemplates('saveAsBtn')}
				</Item>
			)}

			<Separator />
			<Item
				className="text-destructive focus:text-destructive cursor-pointer"
				onClick={() => onDelete()}
			>
				{t('qrCode.actionsMenu.delete')}
			</Item>
		</>
	);
};
