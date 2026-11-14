'use client';

import { PhoneIcon } from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { TPhoneInput } from '@shared/schemas';

interface PhoneDetailsCardProps {
	phone: TPhoneInput;
}

export const PhoneDetailsCard = ({ phone }: PhoneDetailsCardProps) => {
	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default">{phone.phone}</HoverCardTrigger>
			<HoverCardContent className="w-72">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
						<PhoneIcon className="h-4 w-4 text-emerald-500" />
					</div>
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold">{phone.phone}</p>
						<p className="text-xs text-muted-foreground">Phone call</p>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
