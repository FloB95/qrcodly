import type { TQrCodeContentType } from '@shared/schemas';
import {
	DocumentTextIcon,
	LinkIcon,
	WifiIcon,
	IdentificationIcon,
	MapPinIcon,
	CalendarDaysIcon,
	EnvelopeOpenIcon,
	BanknotesIcon,
} from '@heroicons/react/24/outline';

export type ContentTypeConfig = {
	type: TQrCodeContentType;
	label: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	enableBulk: boolean;
};

export const CONTENT_TYPE_CONFIGS: ContentTypeConfig[] = [
	{
		type: 'url',
		label: 'url',
		icon: LinkIcon,
		enableBulk: true,
	},
	{
		type: 'text',
		label: 'text',
		icon: DocumentTextIcon,
		enableBulk: true,
	},
	{
		type: 'wifi',
		label: 'wifi',
		icon: WifiIcon,
		enableBulk: true,
	},
	{
		type: 'vCard',
		label: 'vCard',
		icon: IdentificationIcon,
		enableBulk: true,
	},
	{
		type: 'email',
		label: 'email',
		icon: EnvelopeOpenIcon,
		enableBulk: false,
	},
	{
		type: 'location',
		label: 'location',
		icon: MapPinIcon,
		enableBulk: false,
	},
	{
		type: 'event',
		label: 'event',
		icon: CalendarDaysIcon,
		enableBulk: false,
	},
	{
		type: 'epc',
		label: 'epc',
		icon: BanknotesIcon,
		enableBulk: false,
	},
];

export const BULK_ENABLED_CONTENT_TYPES = CONTENT_TYPE_CONFIGS.filter(
	(config) => config.enableBulk,
).map((config) => config.type);

export const getContentTypeConfig = (type: TQrCodeContentType) =>
	CONTENT_TYPE_CONFIGS.find((config) => config.type === type);
