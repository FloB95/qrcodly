'use client';

import { EnvelopeIcon, PhoneIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import type { TVCardInput } from '@shared/schemas';

interface VCardDetailsCardProps {
	vcard: TVCardInput;
	trigger: React.ReactNode;
}

export const VCardDetailsCard = ({ vcard, trigger }: VCardDetailsCardProps) => {
	const fullName = `${vcard.firstName || ''} ${vcard.lastName || ''}`.trim() || 'Contact';

	return (
		<HoverCard>
			<HoverCardTrigger>{trigger}</HoverCardTrigger>
			<HoverCardContent className="w-80 py-15">
				<div className="space-y-2 text-center">
					<h4 className="text-sm font-semibold">{fullName}</h4>
					{vcard.job && <p className="text-sm text-muted-foreground">{vcard.job}</p>}
					<Separator className="max-w-20 my-4 mx-auto" />
					{vcard.email && (
						<div className="flex items-center justify-center space-x-2 text-sm">
							<EnvelopeIcon className="w-5 h-5" />
							<span className="max-w-xs truncate">{vcard.email}</span>
						</div>
					)}
					{vcard.phone && (
						<div className="flex items-center justify-center space-x-2 text-sm">
							<PhoneIcon className="w-5 h-5" />
							<span>{vcard.phone}</span>
						</div>
					)}
					{vcard.company && (
						<div className="flex items-center justify-center space-x-2 text-sm">
							<BuildingOfficeIcon className="w-5 h-5" />
							<span className="max-w-xs truncate">{vcard.company}</span>
						</div>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
