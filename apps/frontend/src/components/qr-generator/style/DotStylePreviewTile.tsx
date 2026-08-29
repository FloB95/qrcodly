'use client';

import { memo, useEffect, useRef } from 'react';
import QRCodeStyling, { type Options } from 'qr-code-styling';
import type { TDotType } from '@shared/schemas';

interface DotStylePreviewTileProps {
	type: TDotType;
	size?: number;
}

// Short, stable payload so every tile produces the same QR layout (with one
// alignment pattern near the middle) and renders deterministically.
const PREVIEW_DATA = 'qrcodly.de/demo';

// Render a v2-sized QR at 10px per module. At this size we know where the
// finder and the alignment pattern fall, so we can crop a data-rich window
// that *includes* the alignment pattern — that little centre square is what
// makes the preview feel like an actual QR excerpt.
const INTERNAL_SIZE = 250;
const CROP_ORIGIN = 70;
const CROP_SIZE = 110;

const DotStylePreviewTileComponent = ({ type, size = 64 }: DotStylePreviewTileProps) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;

		const options: Options = {
			width: INTERNAL_SIZE,
			height: INTERNAL_SIZE,
			type: 'svg',
			data: PREVIEW_DATA,
			margin: 0,
			dotsOptions: { type, color: '#000000' },
			cornersSquareOptions: { type: 'square', color: '#000000' },
			cornersDotOptions: { type: 'square', color: '#000000' },
			backgroundOptions: { color: 'transparent' },
			qrOptions: { errorCorrectionLevel: 'H' },
		};

		const qr = new QRCodeStyling(options);
		qr.append(node);

		const svg = node.querySelector('svg');
		if (svg) {
			svg.setAttribute('viewBox', `${CROP_ORIGIN} ${CROP_ORIGIN} ${CROP_SIZE} ${CROP_SIZE}`);
			svg.setAttribute('width', String(size));
			svg.setAttribute('height', String(size));
			svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		}

		return () => {
			while (node.firstChild) {
				node.removeChild(node.firstChild);
			}
		};
	}, [type, size]);

	return (
		<div
			ref={ref}
			style={{ width: size, height: size, overflow: 'hidden' }}
			className="flex items-center justify-center"
		/>
	);
};

export const DotStylePreviewTile = memo(DotStylePreviewTileComponent);
