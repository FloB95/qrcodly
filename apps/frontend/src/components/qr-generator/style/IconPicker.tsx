import React, { useEffect, useState } from 'react';
import * as Icons from '@heroicons/react/24/outline';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { ColorPicker } from './ColorPicker';
import { svgToBase64 } from '@/lib/utils';
import ReactDOMServer from 'react-dom/server';
import { Button } from '@/components/ui/button';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';

interface IconPickerProps {
	onSelect: (iconName?: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ onSelect }) => {
	const t = useTranslations('contentElements.iconPicker');
	const [dialogIsOpen, setDialogIsOpen] = useState(false);
	const [selectedIcon, setSelectedIcon] = useState<string | undefined>(undefined);
	const [color, setColor] = useState<string>('#000000');
	const [searchTerm, setSearchTerm] = useState<string>('');

	const handleIconClick = React.useCallback(
		(iconName?: string) => {
			if (iconName) {
				setSelectedIcon(iconName);
				const IconComponent = Icons[iconName as keyof typeof Icons];
				const svgString = ReactDOMServer.renderToString(
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill={color}>
						<IconComponent className="h-6 w-6" style={{ color }} />
					</svg>,
				);
				const base64 = svgToBase64(svgString);
				onSelect(base64);

				posthog.capture('predefined-icon-selected', {
					iconName,
				});
				return;
			}

			onSelect(undefined);
		},
		[color, onSelect],
	);

	const filteredIcons = Object.keys(Icons).filter((iconName) =>
		iconName.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	useEffect(() => {
		if (selectedIcon) {
			handleIconClick(selectedIcon);
		}
	}, [color, selectedIcon]);

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
						className="mb-4 w-full rounded border p-2"
					/>
					<ColorPicker
						defaultColor={color}
						onChange={(color) => {
							setColor(color as string);
						}}
						withGradient={false}
					/>
				</div>
				<div className="grid max-h-[400px] grid-cols-6 gap-4 overflow-y-auto">
					{filteredIcons.map((iconName) => {
						const IconComponent = Icons[iconName as keyof typeof Icons];
						return (
							<div
								key={iconName}
								className={`cursor-pointer rounded border p-2 ${
									selectedIcon === iconName ? 'border-blue-500' : 'border-gray-300'
								}`}
								onClick={() => handleIconClick(iconName)}
							>
								<IconComponent className="mx-auto h-7 w-7" style={{ color }} />
							</div>
						);
					})}
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
