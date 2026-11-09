'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useHostedPagePreview } from '@/hooks/useHostedPagePreview';
import { HostedPagePreview } from '@/components/hosted-page/HostedPagePreview';
import { PreviewViewToggle, type TPreviewView } from '@/components/hosted-page/PreviewViewToggle';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { showsLandingPage } from '@shared/schemas';

/**
 * For hosted content the output column can show either the QR code or the page a scan opens.
 * Non-hosted content renders the QR code only, exactly as before.
 */
export function HostedPreviewSwitch({ children }: { children: ReactNode }) {
	const t = useTranslations('generator.contentSwitch.hosted.previewSwitch');
	const { page, isSample } = useHostedPagePreview();
	const { content, hostedPreviewView, setHostedPreviewView } = useQrCodeGeneratorStore(
		(state) => state,
	);
	const view: TPreviewView = hostedPreviewView ?? 'qr';
	// "open directly": a scan opens the file, there is no page to preview (even before saving)
	if (!page || !showsLandingPage(content)) return <>{children}</>;

	return (
		<div className="flex flex-col items-center gap-4">
			<PreviewViewToggle view={view} onChange={setHostedPreviewView} />
			{view === 'page' ? (
				<div className="flex flex-col items-center gap-3">
					<HostedPagePreview page={page} />
					{isSample && (
						<p className="relative z-10 mt-4 flex max-w-[300px] items-center gap-2 rounded-full bg-white px-3.5 py-2 text-center text-xs text-muted-foreground shadow-sm ring-1 ring-black/5">
							<SparklesIcon className="size-4 shrink-0" aria-hidden="true" />
							{t('sampleHint')}
						</p>
					)}
				</div>
			) : (
				children
			)}
		</div>
	);
}
