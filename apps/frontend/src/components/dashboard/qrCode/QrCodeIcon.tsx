import {
	AtSymbolIcon,
	BanknotesIcon,
	CalendarDaysIcon,
	DocumentTextIcon,
	EnvelopeOpenIcon,
	IdentificationIcon,
	LinkIcon,
	MapPinIcon,
	WifiIcon,
} from '@heroicons/react/24/outline';
import type { TQrCode } from '@shared/schemas';
import { memo } from 'react';
import { cn } from '@/lib/utils';

export const QrCodeIcon = memo(
	({ type, className }: { type: TQrCode['content']['type']; className?: string }) => {
		const icons = {
			url: LinkIcon,
			text: DocumentTextIcon,
			wifi: WifiIcon,
			vCard: IdentificationIcon,
			email: EnvelopeOpenIcon,
			location: MapPinIcon,
			event: CalendarDaysIcon,
			epc: BanknotesIcon,
			socials: AtSymbolIcon,
		};
		const Icon = icons[type] ?? (() => <>❓</>);
		return <Icon className={cn('size-4.5 shrink-0 text-muted-foreground', className)} />;
	},
);

QrCodeIcon.displayName = 'QrIcon';
