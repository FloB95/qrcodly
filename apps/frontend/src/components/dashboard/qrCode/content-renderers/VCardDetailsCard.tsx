'use client';

import {
	EnvelopeIcon,
	PhoneIcon,
	BuildingOfficeIcon,
	BuildingOffice2Icon,
	GlobeAltIcon,
	HomeIcon,
	UserIcon,
} from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import type { TVCardInput } from '@shared/schemas';

interface VCardDetailsCardProps {
	vcard: TVCardInput;
	trigger: React.ReactNode;
}

export const VCardDetailsCard = ({ vcard, trigger }: VCardDetailsCardProps) => {
	const fullName = `${vcard.firstName || ''} ${vcard.lastName || ''}`.trim() || 'Contact';
	const email = vcard.emailPrivate || vcard.emailBusiness || vcard.email;
	const phone = vcard.phoneMobile || vcard.phone || vcard.phonePrivate || vcard.phoneBusiness;
	const privateAddressParts = [
		vcard.streetPrivate,
		vcard.zipPrivate,
		vcard.cityPrivate,
		vcard.statePrivate,
		vcard.countryPrivate,
	].filter(Boolean);
	const businessAddressParts = [
		vcard.streetBusiness,
		vcard.zipBusiness,
		vcard.cityBusiness,
		vcard.stateBusiness,
		vcard.countryBusiness,
	].filter(Boolean);
	const privateAddress = privateAddressParts.length > 0 ? privateAddressParts.join(', ') : null;
	const businessAddress = businessAddressParts.length > 0 ? businessAddressParts.join(', ') : null;

	const rows: { icon: React.ElementType; value: string }[] = [];
	if (vcard.job || vcard.company) {
		const parts = [vcard.job, vcard.company].filter(Boolean);
		rows.push({ icon: BuildingOfficeIcon, value: parts.join(' at ') });
	}
	if (email) rows.push({ icon: EnvelopeIcon, value: email });
	if (phone) rows.push({ icon: PhoneIcon, value: phone });
	if (vcard.website) rows.push({ icon: GlobeAltIcon, value: vcard.website });
	if (privateAddress) rows.push({ icon: HomeIcon, value: privateAddress });
	if (businessAddress) rows.push({ icon: BuildingOffice2Icon, value: businessAddress });

	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default">{trigger}</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
							<UserIcon className="h-4 w-4 text-violet-500" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{fullName}</p>
							{vcard.title && (
								<p className="truncate text-xs text-muted-foreground">{vcard.title}</p>
							)}
						</div>
					</div>
					{rows.length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								{rows.map(({ icon: Icon, value }) => (
									<div key={value} className="flex items-center gap-2 text-sm">
										<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
										<span className="truncate">{value}</span>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
