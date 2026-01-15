'use client';

import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';

export default function LocationContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.location');
	const t2 = useTranslations();
	if (qrCode.content.type !== 'location') return null;

	const data = qrCode.content.data;

	const displayValue = (val?: string | number) =>
		val !== undefined && val !== null ? (
			val
		) : (
			<span className="italic">{t2('general.notProvided')}</span>
		);

	const mapsUrl =
		data.latitude !== undefined && data.longitude !== undefined
			? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
			: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;

	return (
		<>
			<h2 className="font-semibold text-2xl">
				<a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
					{data.address}
				</a>
			</h2>
			<div className="mt-6 space-y-6 text-sm/6">
				<div className="flex space-x-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('latitude.label')}</div>
						<div>{displayValue(data.latitude)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('longitude.label')}</div>
						<div>{displayValue(data.longitude)}</div>
					</div>
				</div>
			</div>
		</>
	);
}
