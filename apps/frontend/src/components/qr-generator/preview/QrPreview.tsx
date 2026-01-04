/**
 * QR Preview - Wrapper component with button and modal
 * Combines the preview button and modal for easy integration
 */

'use client';

import { useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { QrPreviewModal } from './QrPreviewModal';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import posthog from 'posthog-js';

interface QrPreviewProps {
	variant?: 'default' | 'outline' | 'secondary' | 'ghost';
	size?: 'default' | 'sm' | 'lg' | 'icon';
	className?: string;
}

export function QrPreview({ variant = 'outline', size = 'default', className }: QrPreviewProps) {
	const t = useTranslations('generator.preview');
	const [open, setOpen] = useState(false);

	const handleOpen = () => {
		setOpen(true);
		posthog.capture('qr-code.preview.open');
	};

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={handleOpen}
				className={cn(className, 'hidden sm:inline-flex')}
			>
				<EyeIcon className="mr-2 h-4 w-4" />
				{t('button', { default: 'Test Preview' })}
			</Button>

			<QrPreviewModal open={open} onOpenChange={setOpen} />
		</>
	);
}
