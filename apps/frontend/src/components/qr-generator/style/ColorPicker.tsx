'use client';

import { useEffect, useState } from 'react';
import ReactColorPicker, { useColorPicker } from 'react-best-gradient-color-picker';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaintBrushIcon } from '@heroicons/react/24/outline';
import { cn, rgbaToHex } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import type { TColorOrGradient } from '@shared/schemas';

const solidPresets = [
	'#000000',
	'#ffa647',
	'#ffe83f',
	'#9fff5b',
	'#70e2ff',
	'#cd93ff',
	'#09203f',
	'#133337',
	'#DFFF00',
	'#cc0000',
	'#FFBF00',
	'#FF7F50',
	'#DE3163',
	'#9FE2BF',
	'#40E0D0',
	'#6495ED',
	'#CCCCFF',
	'#990000',
];

interface ColorPickerProps {
	defaultColor?: TColorOrGradient;
	onChange: (color: TColorOrGradient) => void;
	withGradient?: boolean;
}

const backgroundToButtonText = (color: TColorOrGradient): string => {
	switch (color.type) {
		case 'hex':
		case 'rgba':
			return color.value;
		case 'gradient':
			return color.colorStops.map((stop) => stop.color).join(' -> ');
	}
};

const fromColorType = (color: TColorOrGradient): string => {
	switch (color.type) {
		case 'hex':
		case 'rgba':
			return color.value;
		case 'gradient':
			const gradientType = color.gradientType === 'linear' ? 'linear-gradient' : 'radial-gradient';
			const colorStops = color.colorStops
				.map((stop) => `${stop.color} ${stop.offset * 100}%`)
				.join(', ');
			return `${gradientType}(${color.rotation}deg, ${colorStops})`;
	}
};

const toColorType = (color: string, getGradientObject: any): TColorOrGradient => {
	const gradientObject = getGradientObject(color);
	if (gradientObject?.isGradient) {
		return {
			type: 'gradient',
			gradientType: gradientObject.gradientType === 'linear-gradient' ? 'linear' : 'radial',
			rotation: gradientObject.degrees ? parseFloat(gradientObject.degrees) : 0,
			colorStops: (gradientObject.colors as { value: string; left: number }[]).map((stop) => ({
				offset: stop.left / 100,
				color: rgbaToHex(stop.value, true),
			})),
		};
	}

	if (color.startsWith('#')) return { type: 'hex', value: color };
	return { type: 'rgba', value: color };
};

export function ColorPicker({ defaultColor, onChange, withGradient = true }: ColorPickerProps) {
	const [color, setColor] = useState(defaultColor ? fromColorType(defaultColor) : '#000000');
	const { getGradientObject, deletePoint } = useColorPicker(color, setColor);
	const [debouncedColor] = useDebouncedValue(color, 200);

	useEffect(() => {
		onChange(toColorType(debouncedColor, getGradientObject));
	}, [debouncedColor]);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" className={cn('w-[220px] justify-start text-left font-normal')}>
					<div className="flex w-full items-center gap-2">
						{color ? (
							<div
								className="h-4 w-4 rounded !bg-cover !bg-center transition-all"
								style={{ background: color }}
							/>
						) : (
							<PaintBrushIcon className="h-4 w-4" />
						)}
						<div className="flex-1 truncate">
							{color
								? backgroundToButtonText(toColorType(color, getGradientObject))
								: 'Pick a color'}
						</div>
					</div>
				</Button>
			</DialogTrigger>
			<DialogContent style={{ width: '320px' }}>
				<DialogTitle hidden>Color Picker</DialogTitle>
				<DialogDescription hidden aria-hidden="true">
					Use the color picker dialog to select a color or gradient for the background.
				</DialogDescription>
				<ReactColorPicker
					config={{ defaultGradient: 'linear-gradient(90deg, #ffa647 0%, #cd93ff 100%)' }}
					presets={solidPresets}
					hideControls={!withGradient}
					disableDarkMode
					hideGradientStop
					hideColorGuide
					hideAdvancedSliders
					width={270}
					height={150}
					value={color}
					onChange={(b) => {
						if (/gradient\(/.test(b) && !/\d+deg/.test(b)) b = b.replace('(', '(0deg, ');
						setColor(b);
						const gradientObject = getGradientObject(b);
						if (gradientObject?.isGradient && gradientObject.colors?.length > 2) {
							deletePoint(1);
						}
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}
