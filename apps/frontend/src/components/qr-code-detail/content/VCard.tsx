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
				{data.title && `${data.title} `}
				{data.firstName} {data.lastName}
			</h2>
			<div className="mt-6 space-y-6 text-sm/6">
				{/* Title */}
				<div>
					<div className="font-medium mb-1">{t('title.label')}</div>
					<div>{displayValue(data.title)}</div>
				</div>

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

				{/* Private Address */}
				<h3 className="text-sm font-semibold text-muted-foreground pt-2">
					{t('addressPrivate.title')}
				</h3>
				<div>
					<div className="font-medium mb-1">{t('streetPrivate.label')}</div>
					<div>{displayValue(data.streetPrivate)}</div>
				</div>
				<div className="flex space-x-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('cityPrivate.label')}</div>
						<div>{displayValue(data.cityPrivate)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('zipPrivate.label')}</div>
						<div>{displayValue(data.zipPrivate)}</div>
					</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t('statePrivate.label')}</div>
					<div>{displayValue(data.statePrivate)}</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t('countryPrivate.label')}</div>
					<div>{displayValue(data.countryPrivate)}</div>
				</div>

				{/* Business Address */}
				<h3 className="text-sm font-semibold text-muted-foreground pt-2">
					{t('addressBusiness.title')}
				</h3>
				<div>
					<div className="font-medium mb-1">{t('streetBusiness.label')}</div>
					<div>{displayValue(data.streetBusiness)}</div>
				</div>
				<div className="flex space-x-4">
					<div className="w-full">
						<div className="font-medium mb-1">{t('cityBusiness.label')}</div>
						<div>{displayValue(data.cityBusiness)}</div>
					</div>
					<div className="w-full">
						<div className="font-medium mb-1">{t('zipBusiness.label')}</div>
						<div>{displayValue(data.zipBusiness)}</div>
					</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t('stateBusiness.label')}</div>
					<div>{displayValue(data.stateBusiness)}</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t('countryBusiness.label')}</div>
					<div>{displayValue(data.countryBusiness)}</div>
				</div>

				{/* Website */}
				<div>
					<div className="font-medium mb-1">{t('website.label')}</div>
					<div>{displayValue(data.website)}</div>
				</div>

				{/* Note */}
				<div>
					<div className="font-medium mb-1">{t('note.label')}</div>
					<div className="whitespace-pre-line">{displayValue(data.note)}</div>
				</div>
			</div>
		</>
	);
}
