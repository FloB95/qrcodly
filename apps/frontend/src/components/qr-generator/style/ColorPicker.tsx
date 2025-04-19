'use client';

import { useEffect, useState } from 'react';
import ReactColorPicker, { useColorPicker } from 'react-best-gradient-color-picker';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaintBrushIcon } from '@heroicons/react/24/outline';
import { cn, rgbaToHex } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';

const solidPresets = [
	'#E2E2E2',
	'#ff75c3',
	'#ffa647',
	'#ffe83f',
	'#9fff5b',
	'#70e2ff',
	'#cd93ff',
	'#09203f',
];

type ColorStop = {
	offset: number;
	color: string;
};

type Gradient = {
	type: 'radial' | 'linear';
	rotation: number;
	colorStops: ColorStop[];
};

type ColorType = string | Gradient;

interface ColorPickerProps {
	defaultColor?: ColorType;
	onChange: (background: ColorType) => void;
	withGradient?: boolean;
}

const backgroundToButtonText = (background: ColorType): string => {
	if (typeof background === 'string') return background;
	const colorStopsStr = background.colorStops.map((stop) => `${stop.color}`).join(' -> ');
	return `${colorStopsStr}`;
};

const fromColorType = (colorType: ColorType): string => {
	if (typeof colorType === 'string') {
		return colorType;
	}

	const gradientType = colorType.type === 'linear' ? 'linear-gradient' : 'radial-gradient';
	const colorStops = colorType.colorStops.map((stop) => `${stop.color} ${stop.offset}%`).join(', ');

	return `${gradientType}(${colorType.rotation}deg, ${colorStops})`;
};

export function ColorPicker({ defaultColor, onChange, withGradient = true }: ColorPickerProps) {
	const [color, setColor] = useState(defaultColor ? fromColorType(defaultColor) : '#000000');
	const { valueToHex, getGradientObject, deletePoint } = useColorPicker(
		fromColorType(color),
		setColor,
	);

	const toColorType = (color: string): ColorType => {
		const gradientObject = getGradientObject(color);
		if (gradientObject?.isGradient) {
			return {
				type: gradientObject.gradientType === 'linear-gradient' ? 'linear' : 'radial',
				rotation: gradientObject.degrees ? parseFloat(gradientObject.degrees) : 90,
				colorStops: (
					gradientObject.colors as {
						value: string;
						left: number;
					}[]
				)?.map((colorStop) => ({
					offset: colorStop.left,
					color: rgbaToHex(colorStop.value, true),
				})),
			};
		}

		return valueToHex();
	};

	const [debouncedColor] = useDebouncedValue(color, 100);

	useEffect(() => {
		if (defaultColor && fromColorType(defaultColor) === debouncedColor) return;
		onChange(toColorType(color));
	}, [debouncedColor]);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant={'outline'}
					className={cn(
						'w-[220px] justify-start text-left font-normal',
						!color && 'text-muted-foreground',
						// className,
					)}
				>
					<div className="flex w-full items-center gap-2">
						{color ? (
							<div
								className="h-4 w-4 rounded !bg-cover !bg-center transition-all"
								style={{ background: color }}
							></div>
						) : (
							<PaintBrushIcon className="h-4 w-4" />
						)}
						<div className="flex-1 truncate">
							{color ? backgroundToButtonText(color) : 'Pick a color'}
						</div>
					</div>
				</Button>
			</DialogTrigger>
			<DialogContent hideOverlay hideClose style={{ width: '320px' }}>
				<DialogTitle hidden>Color Picker</DialogTitle>
				<DialogDescription hidden aria-hidden="true">
					Use the color picker dialog to select a color or gradient for the background. This tool
					supports both solid colors and gradients.
				</DialogDescription>
				<ReactColorPicker
					config={{
						defaultGradient:
							'linear-gradient(90deg, RGB(255, 165, 76) 0%, rgba(205,147,255,1) 100%)',
					}}
					presets={solidPresets}
					hideControls={!withGradient}
					disableDarkMode
					hideGradientStop
					hideColorGuide
					hideOpacity
					hideAdvancedSliders
					width={270}
					height={150}
					value={color}
					onChange={(b) => {
						setColor(b);
						const gradientObject = getGradientObject(b);
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						if (gradientObject?.isGradient && gradientObject.colors?.length > 2) {
							deletePoint(1); // delete the middle point
						}
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}
