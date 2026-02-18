'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling, { type Options } from 'qr-code-styling';
import { cn, createLinkFromShortUrl } from '@/lib/utils';
import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
	isDynamic,
	type TQrCode,
	type TShortUrlResponseDto,
	type TShortUrlWithCustomDomainResponseDto,
} from '@shared/schemas';
import { DynamicBadge } from './DynamicBadge';
import Link from 'next/link';
import { PencilSquareIcon } from '@heroicons/react/24/solid';

export type QrCodeProps = {
	qrCode: Pick<TQrCode, 'config' | 'content'> & { qrCodeData?: TQrCode['qrCodeData'] };
	additionalStyles?: string;
	shortUrl?: TShortUrlWithCustomDomainResponseDto | TShortUrlResponseDto;
};

function getQrCodeData(props: QrCodeProps): string {
	const { qrCode, shortUrl } = props;

	// Use stored qrCodeData if available (has correct custom domain baked in)
	if (qrCode.qrCodeData) {
		return qrCode.qrCodeData;
	}

	// Otherwise compute on the fly (for preview/generator)
	return (
		convertQRCodeDataToStringByType(
			qrCode.content,
			shortUrl ? createLinkFromShortUrl(shortUrl) : undefined,
		) || 'https://qrcodly.de'
	);
}

function areQrCodePropsEqual(prev: QrCodeProps, next: QrCodeProps) {
	const optionsPrev: Options = {
		...convertQrCodeOptionsToLibraryOptions(prev.qrCode.config),
		data: getQrCodeData(prev),
	};

	const optionsNext: Options = {
		...convertQrCodeOptionsToLibraryOptions(next.qrCode.config),
		data: getQrCodeData(next),
	};

	return JSON.stringify(optionsPrev) == JSON.stringify(optionsNext);
}

function QrCode({ qrCode, additionalStyles = '', shortUrl }: QrCodeProps) {
	const options: Options = useMemo(
		() => ({
			...convertQrCodeOptionsToLibraryOptions(qrCode.config),
			data: getQrCodeData({ qrCode, shortUrl }),
		}),
		[qrCode.config, qrCode.content, qrCode.qrCodeData, shortUrl],
	);
	const [qrCodeInstance, setQrCode] = useState<QRCodeStyling>();
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setQrCode(new QRCodeStyling(options));
	}, []);

	useEffect(() => {
		if (ref.current) {
			qrCodeInstance?.append(ref.current);
		}
	}, [qrCodeInstance, ref]);

	useEffect(() => {
		if (!qrCodeInstance) return;

		qrCodeInstance?.update(options);
	}, [qrCodeInstance, options]);

	return (
		<div className="flex flex-col">
			<div
				className={cn(
					'canvas-wrap mx-auto max-h-[200px] max-w-[200px] lg:max-h-[300px] lg:max-w-[300px]',
					additionalStyles,
				)}
				ref={ref}
			/>

			{shortUrl && isDynamic(qrCode.content) && (
				<div className="mt-4 hidden flex-wrap xs:flex items-center justify-between">
					<DynamicBadge />
					<div className="text-xs ml-4 flex items-center gap-1">
						<span className="pt-0.5">{createLinkFromShortUrl(shortUrl, { short: true })}</span>
						<Link href="dashboard/settings/domains">
							<PencilSquareIcon className="size-4 text-black" />
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}

export default memo(QrCode, areQrCodePropsEqual);
