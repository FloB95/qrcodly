'use client';

import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/utils';

export default function EventContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.event');
	const t2 = useTranslations();
	if (qrCode.content.type !== 'event') return null;

	const data = qrCode.content.data;

	const displayValue = (val?: string) =>
		val ?? <span className="italic">{t2('general.notProvided')}</span>;

	return (
		<>
			<h2 className="font-semibold text-2xl">{data.title}</h2>
			<div className="mt-6 space-y-6 text-sm/6">
				<div>
					<div className="font-medium mb-1">{t('description.label')}</div>
					<div className="whitespace-pre-wrap">{displayValue(data.description)}</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t('location.label')}</div>
					<div>{displayValue(data.location)}</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t('url.label')}</div>
					<div>
						{data.url ? (
							<a
								href={data.url}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:underline text-blue-600"
							>
								{data.url}
							</a>
						) : (
							<span className="italic">{t2('general.notProvided')}</span>
						)}
					</div>
				</div>
				<div className="flex space-x-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('startDate.label')}</div>
						<div>{formatDate(data.startDate)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('endDate.label')}</div>
						<div>{formatDate(data.endDate)}</div>
					</div>
				</div>
			</div>
		</>
	);
}
