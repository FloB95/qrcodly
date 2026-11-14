'use client';

import { normalizePhoneNumber, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';

export default function PhoneContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.phone');
	if (qrCode.content.type !== 'phone') return null;

	const data = qrCode.content.data;

	return (
		<>
			<h2 className="font-semibold text-2xl">
				<a href={`tel:${normalizePhoneNumber(data.phone)}`} className="hover:underline">
					{data.phone}
				</a>
			</h2>
			<div className="mt-6 space-y-6 text-sm/6">
				<div>
					<div className="font-medium mb-1">{t('phone.label')}</div>
					<div>{data.phone}</div>
					<div className="mt-1 text-muted-foreground">{t('phone.hint')}</div>
				</div>
			</div>
		</>
	);
}
