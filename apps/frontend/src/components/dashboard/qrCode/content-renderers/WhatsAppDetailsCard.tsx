'use client';

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import type { TWhatsAppInput } from '@shared/schemas';

interface WhatsAppDetailsCardProps {
	whatsapp: TWhatsAppInput;
}

export const WhatsAppDetailsCard = ({ whatsapp }: WhatsAppDetailsCardProps) => {
	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default">{whatsapp.phone}</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
							<WhatsAppIcon className="h-4 w-4 text-green-600" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{whatsapp.phone}</p>
							<p className="text-xs text-muted-foreground">WhatsApp</p>
						</div>
					</div>
					{whatsapp.message && (
						<>
							<Separator />
							<div className="text-sm">
								<span className="text-muted-foreground">Message</span>
								<p className="mt-1 line-clamp-3 text-muted-foreground/80">{whatsapp.message}</p>
							</div>
						</>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
