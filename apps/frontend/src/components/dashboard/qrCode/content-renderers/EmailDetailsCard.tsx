'use client';

import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import type { TEmailInput } from '@shared/schemas';

interface EmailDetailsCardProps {
	email: TEmailInput;
}

export const EmailDetailsCard = ({ email }: EmailDetailsCardProps) => {
	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default">{email.email}</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
							<EnvelopeIcon className="h-4 w-4 text-sky-500" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{email.email}</p>
							<p className="text-xs text-muted-foreground">Email</p>
						</div>
					</div>
					{(email.subject || email.body) && (
						<>
							<Separator />
							<div className="space-y-2">
								{email.subject && (
									<div className="flex items-start justify-between gap-4 text-sm">
										<span className="shrink-0 text-muted-foreground">Subject</span>
										<span className="text-right font-medium">{email.subject}</span>
									</div>
								)}
								{email.body && (
									<div className="text-sm">
										<span className="text-muted-foreground">Body</span>
										<p className="mt-1 line-clamp-3 text-muted-foreground/80">{email.body}</p>
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
