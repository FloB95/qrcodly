'use client';

import { useState, type ReactNode } from 'react';
import { showsLandingPage, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { usePublicHostedPageQuery } from '@/lib/api/hosted-page';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { HostedPagePreview } from '@/components/hosted-page/HostedPagePreview';
import { PreviewViewToggle, type TPreviewView } from '@/components/hosted-page/PreviewViewToggle';

/**
 * The output column of a saved hosted code: the QR code, or with one click the page a scan opens
 * right now. Codes without a page (other types, "open the file directly", an offline page) show
 * the QR code only.
 */
export function SavedHostedPreviewSwitch({
	qrCode,
	children,
}: {
	qrCode: TQrCodeWithRelationsResponseDto;
	children: ReactNode;
}) {
	const [view, setView] = useState<TPreviewView>('qr');
	const hosted = showsLandingPage(qrCode.content);
	const live = usePublicHostedPageQuery(hosted ? qrCode.shortUrl?.shortCode : undefined);
	const page = live.data?.status === 'ok' ? live.data.page : null;
	// the switch depends on fetched data: shown only after hydration, so the server's HTML matches
	const mounted = useHasMounted();

	if (!mounted || !page) return <>{children}</>;

	return (
		<div className="flex flex-col items-center gap-4">
			<PreviewViewToggle view={view} onChange={setView} />
			{view === 'page' ? <HostedPagePreview page={page} /> : children}
		</div>
	);
}
