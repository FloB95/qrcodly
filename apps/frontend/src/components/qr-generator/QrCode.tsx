'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling, { type Options } from 'qr-code-styling';
import { cn, convertQrCodeOptionsToLibraryOptions } from '@/lib/utils';
import { convertQRCodeDataToStringByType, type TQrCode } from '@shared/schemas';

export type QrCodeProps = {
	qrCode: Pick<TQrCode, 'config' | 'content' | 'contentType'>;
	additionalStyles?: string;
};

export default function QrCode({ qrCode, additionalStyles = '' }: QrCodeProps) {

	console.log('QrCode', qrCode);

	const options: Options = useMemo(
		() => ({
			...convertQrCodeOptionsToLibraryOptions(qrCode.config),
			data:
				convertQRCodeDataToStringByType(qrCode.content, qrCode.contentType) || 'https://qrcodly.de',
		}),
		[qrCode.config, qrCode.content, qrCode.contentType],
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
		<>
			<div
				className={cn(
					'canvas-wrap max-h-[200px] max-w-[200px] lg:max-h-[300px] lg:max-w-[300px]',
					additionalStyles,
				)}
				ref={ref}
			/>
		</>
	);
}
