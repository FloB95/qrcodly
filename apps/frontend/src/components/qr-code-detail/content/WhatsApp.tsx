'use client';

import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';

export default function WhatsAppContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.whatsapp');
	const t2 = useTranslations();
	if (qrCode.content.type !== 'whatsapp') return null;

	const data = qrCode.content.data;

	const displayValue = (val?: string) =>
		val ? val : <span className="italic">{t2('general.notProvided')}</span>;

	return (
		<>
			<h2 className="font-semibold text-2xl">
				{qrCode.qrCodeData ? (
					<a
						href={qrCode.qrCodeData}
						target="_blank"
						rel="noopener noreferrer"
						className="hover:underline"
					>
						{data.phone}
					</a>
				) : (
					data.phone
				)}
			</h2>
			<div className="mt-6 space-y-6 text-sm/6">
				<div>
					<div className="font-medium mb-1">{t('phone.label')}</div>
					<div>{data.phone}</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t('message.label')}</div>
					<div className="whitespace-pre-wrap">{displayValue(data.message)}</div>
				</div>
			</div>
		</>
	);
}
