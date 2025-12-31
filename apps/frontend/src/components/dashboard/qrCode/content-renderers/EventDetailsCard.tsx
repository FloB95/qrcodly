'use client';

import { CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
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
			<HoverCardTrigger>{trigger}</HoverCardTrigger>
			<HoverCardContent className="w-80 py-15">
				<div className="space-y-2 text-center">
					<h4 className="text-sm font-semibold">{event.title}</h4>
					{event.description && <p className="text-sm">{event.description}</p>}
					<Separator className="max-w-20 my-4 mx-auto" />
					{event.location && (
						<div className="flex items-center justify-center space-x-2 text-sm">
							<MapPinIcon className="w-5 h-5" />
							<span className="max-w-50">{event.location}</span>
						</div>
					)}
					<div className="text-sm flex space-x-2 justify-center">
						<CalendarIcon className="w-5 h-5" />
						<span>{formatDate(event.startDate)}</span>
					</div>
					<div className="text-sm flex space-x-2 justify-center">
						<CalendarIcon className="w-5 h-5" />
						<span>{formatDate(event.endDate)}</span>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
