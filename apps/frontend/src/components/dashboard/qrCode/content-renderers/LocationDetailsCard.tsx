'use client';

import { MapPinIcon } from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import type { TLocationInput } from '@shared/schemas';

interface LocationDetailsCardProps {
	location: TLocationInput;
}

const formatCoordinate = (value: number, isLatitude: boolean) => {
	const direction = isLatitude ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
	return `${Math.abs(value).toFixed(6)}° ${direction}`;
};

export const LocationDetailsCard = ({ location }: LocationDetailsCardProps) => {
	const hasCoordinates = location.latitude !== undefined && location.longitude !== undefined;

	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default truncate">{location.address}</HoverCardTrigger>
			<HoverCardContent className="w-72">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
							<MapPinIcon className="h-4 w-4 text-red-500" />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold">Location</p>
							<p className="text-xs text-muted-foreground">Geographic coordinates</p>
						</div>
					</div>
					<Separator />
					<div className="space-y-2">
						<p className="text-sm">{location.address}</p>
						{hasCoordinates && (
							<div className="space-y-1 text-xs text-muted-foreground">
								<div className="flex items-center justify-between">
									<span>Latitude</span>
									<span className="font-mono">{formatCoordinate(location.latitude!, true)}</span>
								</div>
								<div className="flex items-center justify-between">
									<span>Longitude</span>
									<span className="font-mono">{formatCoordinate(location.longitude!, false)}</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
