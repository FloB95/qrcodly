import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { TQrCodeOptions } from '@shared/schemas';
import { blobToDataUrl, type QrcodlyApi } from '../lib/api-client';

type Props = {
	api: QrcodlyApi;
	config: TQrCodeOptions | null | undefined;
	data: string | null | undefined;
	sizePx?: number;
};

const cache = new Map<string, string>();

export function QrPreview({ api, config, data, sizePx = 320 }: Props) {
	const [pngUrl, setPngUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!config || !data) {
			setPngUrl(null);
			return;
		}
		const cacheKey = JSON.stringify({ config, data, sizePx });
		const hit = cache.get(cacheKey);
		if (hit) {
			setPngUrl(hit);
			setError(null);
			return;
		}
		let cancelled = false;
		// The previous image stays up until this render lands, so live previews don't flash.
		setError(null);
		void api
			.renderQr({ config, data, sizePx, format: 'png' })
			.then(blobToDataUrl)
			.then((url) => {
				if (cancelled) return;
				cache.set(cacheKey, url);
				setPngUrl(url);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : 'Preview failed');
			});
		return () => {
			cancelled = true;
		};
	}, [api, config, data, sizePx]);

	if (error) {
		return (
			<span className="qr-preview is-error" title={error}>
				<ExclamationTriangleIcon />
			</span>
		);
	}
	if (!pngUrl) return <span className="qr-preview is-loading" />;
	return <img className="qr-preview" src={pngUrl} alt="" draggable={false} />;
}
