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

export const QrCodeIcon = memo(({ type }: { type: TQrCode['content']['type'] }) => {
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
	return <Icon className="mr-2 h-6 w-6" />;
});

QrCodeIcon.displayName = 'QrIcon';
