'use client';

import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useTranslations } from 'next-intl';

export default function VCardContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.vCard');
	const t2 = useTranslations();
	if (qrCode.content.type !== 'vCard') return null;

	const data = qrCode.content.data;

	const displayValue = (val?: string) =>
		val ?? <span className="italic">{t2('general.notProvided')}</span>;

	return (
		<>
			<h2 className="font-semibold text-2xl">
				{data.firstName} {data.lastName}
			</h2>
			<div className="mt-6 space-y-6 text-sm/6">
				{/* First and Last Name */}
				<div className="flex space-x-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('firstName.label')}</div>
						<div>{displayValue(data.firstName)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('lastName.label')}</div>
						<div>{displayValue(data.lastName)}</div>
					</div>
				</div>

				{/* Email Addresses */}
				<div className="flex space-x-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('emailPrivate.label')}</div>
						<div>{displayValue(data.emailPrivate || data.email)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('emailBusiness.label')}</div>
						<div>{displayValue(data.emailBusiness)}</div>
					</div>
				</div>

				{/* Phone Numbers */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('phonePrivate.label')}</div>
						<div>{displayValue(data.phonePrivate)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('phoneMobile.label')}</div>
						<div>{displayValue(data.phoneMobile || data.phone)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('phoneBusiness.label')}</div>
						<div>{displayValue(data.phoneBusiness)}</div>
					</div>
				</div>

				{/* Fax */}
				<div>
					<div className="font-medium mb-1">{t('fax.label')}</div>
					<div>{displayValue(data.fax)}</div>
				</div>

				{/* Company and Job */}
				<div className="flex space-x-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('company.label')}</div>
						<div>{displayValue(data.company)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('jobTitle.label')}</div>
						<div>{displayValue(data.job)}</div>
					</div>
				</div>

				{/* Street */}
				<div>
					<div className="font-medium mb-1">{t('street.label')}</div>
					<div>{displayValue(data.street)}</div>
				</div>

				{/* City and Zip */}
				<div className="flex space-x-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('city.label')}</div>
						<div>{displayValue(data.city)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('zipCode.label')}</div>
						<div>{displayValue(data.zip)}</div>
					</div>
				</div>

				{/* State */}
				<div>
					<div className="font-medium mb-1">{t('state.label')}</div>
					<div>{displayValue(data.state)}</div>
				</div>

				{/* Country */}
				<div>
					<div className="font-medium mb-1">{t('country.label')}</div>
					<div>{displayValue(data.country)}</div>
				</div>

				{/* Website */}
				<div>
					<div className="font-medium mb-1">{t('website.label')}</div>
					<div>{displayValue(data.website)}</div>
				</div>
			</div>
		</>
	);
}
