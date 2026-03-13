'use client';

import { WifiIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { TWifiInput } from '@shared/schemas';

interface WifiDetailsCardProps {
	wifi: TWifiInput;
}

export const WifiDetailsCard = ({ wifi }: WifiDetailsCardProps) => {
	const encryptionLabel = wifi.encryption === 'nopass' ? 'Open' : wifi.encryption.toUpperCase();

	return (
		<HoverCard>
			<HoverCardTrigger className="cursor-default">{wifi.ssid}</HoverCardTrigger>
			<HoverCardContent className="w-72">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
							<WifiIcon className="h-4 w-4 text-blue-500" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{wifi.ssid}</p>
							<p className="text-xs text-muted-foreground">Wi-Fi Network</p>
						</div>
					</div>
					<Separator />
					<div className="space-y-2">
						{wifi.password && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Password</span>
								<span className="font-mono text-xs tracking-wider">
									{'*'.repeat(Math.min(wifi.password.length, 12))}
								</span>
							</div>
						)}
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Security</span>
							<Badge variant="secondary" className="gap-1 text-xs font-normal">
								{wifi.encryption === 'nopass' ? (
									<LockOpenIcon className="h-3 w-3" />
								) : (
									<LockClosedIcon className="h-3 w-3" />
								)}
								{encryptionLabel}
							</Badge>
						</div>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
};
