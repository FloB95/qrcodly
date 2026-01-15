'use client';

import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';

export default function EmailContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.email');
	const t2 = useTranslations();
	if (qrCode.content.type !== 'email') return null;

	const data = qrCode.content.data;

	const displayValue = (val?: string) =>
		val ?? <span className="italic">{t2('general.notProvided')}</span>;

	return (
		<>
			<h2 className="font-semibold text-2xl">
				<a href={`mailto:${data.email}`} className="hover:underline">
					{data.email}
				</a>
			</h2>
			<div className="mt-6 space-y-6 text-sm/6">
				<div>
					<div className="font-medium mb-1">{t('subject.label')}</div>
					<div>{displayValue(data.subject)}</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t('body.label')}</div>
					<div className="whitespace-pre-wrap">{displayValue(data.body)}</div>
				</div>
			</div>
		</>
	);
}
