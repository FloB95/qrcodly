import { useEffect, useState } from 'react';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { renderQrCodeToPngDataUrl } from '../lib/qr-renderer';
import { QrPreview } from './QrPreview';

const pngCache = new Map<string, string>();

type Props = { qr: TQrCodeWithRelationsResponseDto };

export function QrThumb({ qr }: Props) {
	const cacheKey = qr.id;
	const [pngUrl, setPngUrl] = useState<string | null>(pngCache.get(cacheKey) ?? null);

	useEffect(() => {
		if (pngCache.has(cacheKey)) {
			setPngUrl(pngCache.get(cacheKey) ?? null);
			return;
		}
		let cancelled = false;
		void renderQrCodeToPngDataUrl(qr)
			.then((url) => {
				if (cancelled) return;
				pngCache.set(cacheKey, url);
				setPngUrl(url);
			})
			.catch(() => {
				// thumbnail render failure is non-fatal
			});
		return () => {
			cancelled = true;
		};
	}, [cacheKey, qr]);

	return <QrPreview pngDataUrl={pngUrl} />;
}
