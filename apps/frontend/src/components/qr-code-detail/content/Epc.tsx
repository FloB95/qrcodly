'use client';

import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';

export default function EpcContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.epc');
	const t2 = useTranslations();
	if (qrCode.content.type !== 'epc') return null;

	const data = qrCode.content.data;

	const displayValue = (val?: string | number) =>
		val !== undefined && val !== '' ? (
			val
		) : (
			<span className="italic">{t2('general.notProvided')}</span>
		);

	const formatIban = (iban: string) => {
		// Format IBAN with spaces every 4 characters for readability
		return iban.replace(/(.{4})/g, '$1 ').trim();
	};

	const formatAmount = (amount?: number) => {
		if (amount === undefined) return undefined;
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount);
	};

	return (
		<>
			<h2 className="font-semibold text-2xl">{data.name}</h2>
			<div className="mt-6 space-y-6 text-sm/6">
				{/* IBAN */}
				<div>
					<div className="font-medium mb-1">{t('iban.label')}</div>
					<div className="font-mono text-base">{formatIban(data.iban)}</div>
				</div>

				{/* BIC */}
				<div>
					<div className="font-medium mb-1">{t('bic.label')}</div>
					<div className="font-mono">{displayValue(data.bic)}</div>
				</div>

				{/* Amount */}
				<div>
					<div className="font-medium mb-1">{t('amount.label')}</div>
					<div className="text-lg font-semibold text-green-700">
						{data.amount ? formatAmount(data.amount) : displayValue(undefined)}
					</div>
				</div>

				{/* Purpose */}
				<div>
					<div className="font-medium mb-1">{t('purpose.label')}</div>
					<div className="whitespace-pre-wrap">{displayValue(data.purpose)}</div>
				</div>
			</div>
		</>
	);
}
