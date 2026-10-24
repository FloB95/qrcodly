import type { ComponentType, SVGProps } from 'react';
import {
	BanknotesIcon,
	CalendarDaysIcon,
	DocumentTextIcon,
	EnvelopeOpenIcon,
	IdentificationIcon,
	LinkIcon,
	MapPinIcon,
	WifiIcon,
} from '@heroicons/react/24/outline';
import type { TQrCodeContentType, TQrCodeWithRelationsResponseDto } from '@shared/schemas';

// Icons match the web app's content-type.config.ts.
export const CONTENT_TYPES: Record<
	TQrCodeContentType,
	{ label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
	url: { label: 'URL', icon: LinkIcon },
	text: { label: 'Text', icon: DocumentTextIcon },
	wifi: { label: 'WiFi', icon: WifiIcon },
	vCard: { label: 'vCard', icon: IdentificationIcon },
	email: { label: 'Email', icon: EnvelopeOpenIcon },
	location: { label: 'Location', icon: MapPinIcon },
	event: { label: 'Event', icon: CalendarDaysIcon },
	epc: { label: 'EPC', icon: BanknotesIcon },
};

export function isDynamicQrCode(qr: TQrCodeWithRelationsResponseDto): boolean {
	const data = qr.content.data as { isDynamic?: boolean } | string;
	return qr.shortUrl !== null && typeof data === 'object' && data.isDynamic === true;
}
