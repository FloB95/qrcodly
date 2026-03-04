'use client';

import { CalendarIcon, MapPinIcon, LinkIcon } from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/utils';
import type { TEventInput } from '@shared/schemas';

interface EventDetailsCardProps {
	event: TEventInput;
	trigger: React.ReactNode;
}

export const EventDetailsCard = ({ event, trigger }: EventDetailsCardProps) => {
	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default">{trigger}</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
							<CalendarIcon className="h-4 w-4 text-orange-500" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{event.title}</p>
							<p className="text-xs text-muted-foreground">Event</p>
						</div>
					</div>
					<Separator />
					<div className="space-y-2">
						{event.description && (
							<p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
						)}
						<div className="flex items-center gap-2 text-sm">
							<CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
							<span>
								{formatDate(event.startDate)} &ndash; {formatDate(event.endDate)}
							</span>
						</div>
						{event.location && (
							<div className="flex items-center gap-2 text-sm">
								<MapPinIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="truncate">{event.location}</span>
							</div>
						)}
						{event.url && (
							<div className="flex items-center gap-2 text-sm">
								<LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="truncate text-muted-foreground">{event.url}</span>
							</div>
						)}
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
