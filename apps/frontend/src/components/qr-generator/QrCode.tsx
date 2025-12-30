'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling, { type Options } from 'qr-code-styling';
import { cn, getShortUrlFromCode } from '@/lib/utils';
import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
	isDynamic,
	type TQrCode,
	type TShortUrl,
} from '@shared/schemas';
import { DynamicBadge } from './DynamicBadge';

export type QrCodeProps = {
	qrCode: Pick<TQrCode, 'config' | 'content'>;
	additionalStyles?: string;
	shortUrl?: TShortUrl;
};

function areQrCodePropsEqual(prev: QrCodeProps, next: QrCodeProps) {
	const optionsPrev: Options = {
		...convertQrCodeOptionsToLibraryOptions(prev.qrCode.config),
		data: convertQRCodeDataToStringByType(prev.qrCode.content) || 'https://qrcodly.de',
	};

	const optionsNext: Options = {
		...convertQrCodeOptionsToLibraryOptions(next.qrCode.config),
		data: convertQRCodeDataToStringByType(next.qrCode.content) || 'https://qrcodly.de',
	};

	return JSON.stringify(optionsPrev) == JSON.stringify(optionsNext);
}

function QrCode({ qrCode, additionalStyles = '', shortUrl }: QrCodeProps) {
	const options: Options = useMemo(
		() => ({
			...convertQrCodeOptionsToLibraryOptions(qrCode.config),
			data: convertQRCodeDataToStringByType(qrCode.content) || 'https://qrcodly.de',
		}),
		[qrCode.config, qrCode.content],
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
					'canvas-wrap max-h-[200px] max-w-[200px] lg:max-h-[300px] lg:max-w-[300px]',
					additionalStyles,
				)}
				ref={ref}
			/>
			{shortUrl && isDynamic(qrCode.content) && (
				<div className="mt-4 flex items-center justify-between">
					<DynamicBadge />
					<div className="text-xs ml-4">{getShortUrlFromCode(shortUrl.shortCode, true)}</div>
				</div>
			)}
		</div>
	);
}

export default memo(QrCode, areQrCodePropsEqual);
