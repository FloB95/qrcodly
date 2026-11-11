'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Options } from 'qr-code-styling';
import type { TFileExtension } from '@shared/schemas';
import { toast } from '@/components/ui/use-toast';
import { downloadQrCode } from '@/lib/qr-render';

/** Download with a visible message when the code cannot be built (the error itself goes to Sentry). */
export function useDownloadQrCode() {
	const t = useTranslations('qrCode.download');

	return useCallback(
		async (options: Options, name: string, extension: TFileExtension) => {
			try {
				await downloadQrCode(options, name, extension);
			} catch {
				toast({ variant: 'destructive', title: t('renderError') });
			}
		},
		[t],
	);
}
