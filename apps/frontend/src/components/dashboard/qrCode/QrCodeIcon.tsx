import { DocumentTextIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import type { TQrCode } from '@shared/schemas';
import { LinkIcon, WifiIcon } from 'lucide-react';
import { memo } from 'react';

export const QrCodeIcon = memo(({ type }: { type: TQrCode['content']['type'] }) => {
	const icons = {
		url: LinkIcon,
		text: DocumentTextIcon,
		wifi: WifiIcon,
		vCard: IdentificationIcon,
	};
	const Icon = icons[type] ?? (() => <>❓</>);
	return <Icon className="mr-2 h-6 w-6" />;
});

QrCodeIcon.displayName = 'QrIcon';
