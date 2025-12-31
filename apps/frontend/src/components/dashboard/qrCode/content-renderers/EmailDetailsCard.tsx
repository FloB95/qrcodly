'use client';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import type { TEmailInput } from '@shared/schemas';

interface EmailDetailsCardProps {
	email: TEmailInput;
}

export const EmailDetailsCard = ({ email }: EmailDetailsCardProps) => {
	return (
		<HoverCard>
			<HoverCardTrigger>{email.email}</HoverCardTrigger>
			<HoverCardContent className="w-80 py-15">
				<div className="space-y-2 text-center">
					<h3 className="text-sm font-semibold">{email.email}</h3>
					<Separator className="max-w-20 my-4 mx-auto" />
					{email.subject && <h4 className="text-sm font-semibold">{email.subject}</h4>}
					{email.body && <p className="text-sm">{email.body}</p>}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
