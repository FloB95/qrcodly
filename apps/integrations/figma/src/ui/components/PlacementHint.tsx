import { useEffect, useState, type ReactNode } from 'react';
import {
	ArrowPathIcon,
	CursorArrowRaysIcon,
	ViewfinderCircleIcon,
} from '@heroicons/react/24/outline';
import type { PlacementTarget } from '../../shared/messages';
import { onPlacementChange, plugin } from '../lib/bridge';

function describe(target: PlacementTarget): ReactNode {
	switch (target.mode) {
		case 'viewport':
			return 'Lands in the center of your view. Select a frame or shape first to fit it there.';
		case 'replace':
			return (
				<>
					Replaces the selected QR code <strong>{target.nodeName}</strong>
				</>
			);
		case 'fill':
			return (
				<>
					Fills the empty frame <strong>{target.nodeName}</strong>
				</>
			);
		case 'inside':
			return (
				<>
					Goes inside <strong>{target.nodeName}</strong>
				</>
			);
		case 'cover':
			return (
				<>
					Fits onto <strong>{target.nodeName}</strong>
				</>
			);
	}
}

/** Mirrors the current Figma selection so it is clear where the next insert lands. */
export function PlacementHint() {
	const [target, setTarget] = useState<PlacementTarget>({ mode: 'viewport' });

	useEffect(() => {
		plugin
			.getPlacement()
			.then(setTarget)
			.catch(() => {
				/* keep the viewport default */
			});
		return onPlacementChange(setTarget);
	}, []);

	const Icon =
		target.mode === 'viewport'
			? CursorArrowRaysIcon
			: target.mode === 'replace'
				? ArrowPathIcon
				: ViewfinderCircleIcon;

	return (
		<p className={target.mode === 'viewport' ? 'hint' : 'hint is-targeted'}>
			<Icon />
			<span>{describe(target)}</span>
		</p>
	);
}
