'use client';

import { useMemo } from 'react';
import ReactColorPicker from 'react-best-gradient-color-picker';
import {
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaintBrushIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { TColorOrGradient } from '@shared/schemas';
import { colorToButtonText, pickerStringToColorType } from '@/lib/color-picker.utils';
import { useColorPickerState } from '@/hooks/use-color-picker-state';
import {
	SOLID_COLOR_PRESETS,
	DEFAULT_GRADIENT,
	COLOR_PICKER_CONFIG,
} from './ColorPicker.constants';

interface ColorPickerProps {
	defaultColor?: TColorOrGradient;
	onChange: (color: TColorOrGradient) => void;
	withGradient?: boolean;
}

/**
 * ColorPicker Component
 *
 * @param defaultColor - Initial color value
 * @param onChange - Callback when color changes (debounced)
 * @param withGradient - Whether to show gradient controls (default: true)
 *
 * @example
 * ```tsx
 * <ColorPicker
 *   defaultColor={{ type: 'hex', value: '#ff0000' }}
 *   onChange={(color) => console.log(color)}
 *   withGradient={true}
 * />
 * ```
 */
export function ColorPicker({ defaultColor, onChange, withGradient = true }: ColorPickerProps) {
	const { color, getGradientObject, handleColorChange } = useColorPickerState({
		defaultColor,
		onChange,
	});

	const buttonText = useMemo(() => {
		if (!color) return 'Pick a color';
		const colorObject = pickerStringToColorType(color, getGradientObject);
		return colorToButtonText(colorObject);
	}, [color]);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" className={cn('w-[220px] justify-start text-left font-normal')}>
					<div className="flex w-full items-center gap-2">
						{color ? (
							<div
								className="h-4 w-4 rounded bg-cover! bg-center! transition-all"
								style={{ background: color }}
							/>
						) : (
							<PaintBrushIcon className="h-4 w-4" />
						)}
						<div className="flex-1 truncate">{buttonText}</div>
					</div>
				</Button>
			</DialogTrigger>
			<DialogContent style={{ width: `${COLOR_PICKER_CONFIG.DIALOG_WIDTH}px` }}>
				<DialogTitle hidden>Color Picker</DialogTitle>
				<DialogDescription hidden aria-hidden="true">
					Use the color picker dialog to select a color or gradient for the background.
				</DialogDescription>
				<ReactColorPicker
					config={{ defaultGradient: DEFAULT_GRADIENT }}
					presets={SOLID_COLOR_PRESETS}
					hideControls={!withGradient}
					disableDarkMode
					hideGradientStop
					hideColorGuide
					hideAdvancedSliders
					width={COLOR_PICKER_CONFIG.PICKER_WIDTH}
					height={COLOR_PICKER_CONFIG.PICKER_HEIGHT}
					value={color}
					onChange={handleColorChange}
				/>
			</DialogContent>
		</Dialog>
	);
}
