'use client';

import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';

export default function WifiContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.wifi');
	if (qrCode.content.type !== 'wifi') return null;

	const encryptionLabel = (() => {
		switch (qrCode.content.data.encryption) {
			case 'WPA':
				return t('encryption.optionLabelWpa');
			case 'WEP':
				return t('encryption.optionLabelWep');
			case 'nopass':
				return t('encryption.optionNoPass');
			default:
				return qrCode.content.data.encryption;
		}
	})();

	return (
		<>
			<h2 className="font-semibold text-2xl ">{qrCode.content.data.ssid}</h2>
			<div className="mt-6 grid grid-cols-1 text-sm/6 sm:grid-cols-2">
				<div className="sm:pr-4">
					<div className="text-sm font-medium leading-none mb-3">{t('encryption.label')}</div>
					<div>{encryptionLabel}</div>
				</div>
				<div className="mt-2 sm:mt-0 sm:pl-4">
					<div className="text-sm font-medium leading-none mb-3">{t('password.label')}</div>
					<div>{'*'.repeat(qrCode.content.data.password?.length ?? 0)}</div>
				</div>
			</div>
		</>
	);
}
