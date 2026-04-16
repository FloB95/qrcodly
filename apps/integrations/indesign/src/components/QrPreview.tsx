import { useEffect, useState } from 'react';
import type { TQrCodeOptions } from '@shared/schemas';
import { blobToDataUrl, QrcodlyApi } from '../lib/api-client';

type Props = {
	api: QrcodlyApi;
	config: TQrCodeOptions | null | undefined;
	data: string | null | undefined;
	sizePx?: number;
	alt?: string;
};

const cache = new Map<string, string>();

export function QrPreview({ api, config, data, sizePx, alt = '' }: Props) {
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
		setError(null);
		void api
			.renderQrPng({ config, data, sizePx })
			.then(blobToDataUrl)
			.then((url) => {
				if (cancelled) return;
				cache.set(cacheKey, url);
				setPngUrl(url);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : 'render failed');
			});
		return () => {
			cancelled = true;
		};
	}, [api, config, data, sizePx]);

	if (error) return <div className="qr-preview-img fallback" title={error} />;
	if (!pngUrl) return <div className="qr-preview-img fallback" />;
	return <img className="qr-preview-img" src={pngUrl} alt={alt} />;
}
