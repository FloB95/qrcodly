'use client';

import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import type { TSmsInput } from '@shared/schemas';

interface SmsDetailsCardProps {
	sms: TSmsInput;
}

export const SmsDetailsCard = ({ sms }: SmsDetailsCardProps) => {
	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default">{sms.phone}</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
							<ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-violet-500" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{sms.phone}</p>
							<p className="text-xs text-muted-foreground">SMS</p>
						</div>
					</div>
					{sms.message && (
						<>
							<Separator />
							<div className="text-sm">
								<span className="text-muted-foreground">Message</span>
								<p className="mt-1 line-clamp-3 text-muted-foreground/80">{sms.message}</p>
							</div>
						</>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
