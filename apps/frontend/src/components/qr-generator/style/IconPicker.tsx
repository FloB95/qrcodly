'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as Icons from '@heroicons/react/24/outline';
import ReactDOMServer from 'react-dom/server';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ColorPicker } from './ColorPicker';
import { svgToBase64 } from '@/lib/utils';
import type { TColorOrGradient } from '@shared/schemas';

/* ------------------------------------------------------------------ */
/* Custom Social Icons                                                 */
/* ------------------------------------------------------------------ */

const CUSTOM_ICONS = [
	{ key: 'instagram', src: '/social-logos/instagram.svg' },
	{ key: 'whatsapp', src: '/social-logos/whatsapp.svg' },
	{ key: 'tiktok', src: '/social-logos/tiktok.svg' },
	{ key: 'youtube', src: '/social-logos/youtube.svg' },
	{ key: 'spotify', src: '/social-logos/spotify.svg' },
	{ key: 'threads', src: '/social-logos/threads.svg' },
	{ key: 'facebook', src: '/social-logos/facebook.svg' },
	{ key: 'x', src: '/social-logos/x.svg' },
	{ key: 'soundcloud', src: '/social-logos/soundcloud.svg' },
	{ key: 'snapchat', src: '/social-logos/snapchat.svg' },
	{ key: 'pinterest', src: '/social-logos/pinterest.svg' },
	{ key: 'patreon', src: '/social-logos/patreon.svg' },
] as const;

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type PickerIcon =
	| { type: 'hero'; key: keyof typeof Icons }
	| { type: 'custom'; key: string; src: string };

/* ------------------------------------------------------------------ */
/* ALL_ICONS - Module scope to prevent recreation on every render     */
/* ------------------------------------------------------------------ */

const ALL_ICONS: PickerIcon[] = [
	...CUSTOM_ICONS.map((icon) => ({
		type: 'custom' as const,
		key: icon.key,
		src: icon.src,
	})),
	...Object.keys(Icons).map((key) => ({
		type: 'hero' as const,
		key: key as keyof typeof Icons,
	})),
];

interface IconPickerProps {
	onSelect: (iconBase64?: string) => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const fetchSvgAsBase64 = async (src: string, color: string): Promise<string | undefined> => {
	try {
		const res = await fetch(src);

		if (!res.ok) {
			console.error(`Failed to fetch SVG: ${res.status} ${res.statusText}`);
			return undefined;
		}

		let svg = await res.text();

		// Validate that we got SVG content
		if (!svg.trim().startsWith('<svg')) {
			console.error('Invalid SVG content received');
			return undefined;
		}

		// Enable color control if SVG uses currentColor
		svg = svg.replace(/currentColor/g, color);

		return svgToBase64(svg);
	} catch (error) {
		console.error('Error fetching or processing SVG:', error);
		return undefined;
	}
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const IconPicker: React.FC<IconPickerProps> = ({ onSelect }) => {
	const t = useTranslations('contentElements.iconPicker');

	const [dialogIsOpen, setDialogIsOpen] = useState(false);
	const [selectedIcon, setSelectedIcon] = useState<string | undefined>();
	const [searchTerm, setSearchTerm] = useState('');
	const [color, setColor] = useState<Extract<TColorOrGradient, { type: 'hex' }>>({
		type: 'hex',
		value: '#000000',
	});

	/* ------------------------------------------------------------------ */
	/* Icon Selection                                                     */
	/* ------------------------------------------------------------------ */

	const handleIconClick = useCallback(
		async (icon?: PickerIcon) => {
			if (!icon) {
				setSelectedIcon(undefined);
				onSelect(undefined);
				return;
			}

			setSelectedIcon(icon.key);

			if (icon.type === 'hero') {
				const IconComponent = Icons[icon.key];
				const svgString = ReactDOMServer.renderToString(
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill={color.value}>
						<IconComponent className="h-6 w-6" style={{ color: color.value }} />
					</svg>,
				);

				onSelect(svgToBase64(svgString));

				posthog.capture('predefined-icon-selected', {
					iconName: icon.key,
				});
			}

			if (icon.type === 'custom') {
				const base64 = await fetchSvgAsBase64(icon.src, color.value);
				onSelect(base64);

				posthog.capture('custom-icon-selected', {
					iconName: icon.key,
				});
			}
		},
		[color, onSelect],
	);

	/* Re-apply color when color changes */
	useEffect(() => {
		if (!selectedIcon) return;

		const icon = ALL_ICONS.find((i) => i.key === selectedIcon);
		if (icon) {
			void handleIconClick(icon);
		}
	}, [color, selectedIcon]);

	/* ------------------------------------------------------------------ */
	/* Filter                                                            */
	/* ------------------------------------------------------------------ */

	const filteredIcons = useMemo(
		() => ALL_ICONS.filter((icon) => icon.key.toLowerCase().includes(searchTerm.toLowerCase())),
		[searchTerm],
	);

	/* ------------------------------------------------------------------ */
	/* Render                                                            */
	/* ------------------------------------------------------------------ */

	return (
		<Dialog open={dialogIsOpen} onOpenChange={setDialogIsOpen}>
			<DialogTrigger asChild>
				<Button>{t('openTrigger')}</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogTitle>{t('dialogTitle')}</DialogTitle>
				<DialogDescription>{t('dialogDescription')}</DialogDescription>

				<div className="mt-4 flex space-x-4">
					<input
						type="text"
						placeholder={t('searchPlaceholder')}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded border p-2"
						autoFocus={false}
					/>

					<ColorPicker
						defaultColor={color}
						onChange={(c) => c.type === 'hex' && setColor(c)}
						withGradient={false}
					/>
				</div>

				<div className="grid max-h-[400px] grid-cols-6 gap-4 overflow-y-auto mt-4">
					{filteredIcons.map((icon) => (
						<div
							key={icon.key}
							className={`cursor-pointer rounded border p-2 ${
								selectedIcon === icon.key ? 'border-black border-2' : 'border-gray-300'
							}`}
							onClick={() => handleIconClick(icon)}
						>
							{icon.type === 'hero' ? (
								(() => {
									const IconComponent = Icons[icon.key];
									return (
										<IconComponent className="mx-auto h-7 w-7" style={{ color: color.value }} />
									);
								})()
							) : (
								<img src={icon.src} alt={icon.key} className="mx-auto h-7 w-7" />
							)}
						</div>
					))}
				</div>

				<DialogFooter>
					<Button
						variant="secondary"
						onClick={() => {
							setDialogIsOpen(false);
							handleIconClick(undefined);
						}}
					>
						{t('clearBtn')}
					</Button>

					<Button onClick={() => setDialogIsOpen(false)} disabled={!selectedIcon}>
						{t('selectBtn')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default IconPicker;
