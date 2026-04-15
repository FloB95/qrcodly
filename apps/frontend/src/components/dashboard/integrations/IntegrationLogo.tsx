'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

// Maps each integration catalog id to a file under public/images/integrations/.
// Filename (including extension) is explicit so each logo can ship in whatever
// format its source brand kit provides — svg, png, or webp.
const LOGO_FILE_BY_ID: Record<string, string> = {
	'google-analytics': 'google-analytics.svg',
	matomo: 'matomo.svg',
	'browser-extension-chrome': 'chrome.png',
	chatgpt: 'chatgpt.webp',
};

type IntegrationLogoProps = {
	integrationId: string;
	alt?: string;
	className?: string;
};

export function IntegrationLogo({ integrationId, alt = '', className }: IntegrationLogoProps) {
	const filename = LOGO_FILE_BY_ID[integrationId];
	if (!filename) {
		return null;
	}
	return (
		<Image
			src={`/images/integrations/${filename}`}
			alt={alt}
			width={32}
			height={32}
			className={cn('shrink-0 object-contain', className)}
			unoptimized
		/>
	);
}
