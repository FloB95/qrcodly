/**
 * Custom hook for managing ColorPicker state
 *
 * Encapsulates color picker state management, including:
 * - Color state and debouncing
 * - Conversion between TColorOrGradient and picker string format
 * - Gradient normalization and validation
 * - Proper React Hook dependencies to avoid stale closures
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useColorPicker } from 'react-best-gradient-color-picker';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { TColorOrGradient } from '@shared/schemas';
import {
	colorTypeToPickerString,
	pickerStringToColorType,
	normalizeGradientString,
	type GetGradientObjectFn,
	type GradientObject,
} from '@/lib/color-picker.utils';
import { COLOR_PICKER_CONFIG } from '@/components/qr-generator/style/ColorPicker.constants';

/**
 * Props for the useColorPickerState hook
 */
interface UseColorPickerStateProps {
	defaultColor?: TColorOrGradient;
	onChange: (color: TColorOrGradient) => void;
}

/**
 * Return value from the useColorPickerState hook
 */
interface UseColorPickerStateReturn {
	color: string;
	getGradientObject: GetGradientObjectFn;
	handleColorChange: (newColor: string) => void;
}

/**
 * Custom hook for managing ColorPicker state
 *
 * This hook encapsulates all state logic for the ColorPicker component,
 * fixing the missing dependency warnings and preventing stale closures.
 *
 * @param props - Hook configuration
 * @returns Color state and handlers
 *
 * @example
 * ```tsx
 * function ColorPicker({ defaultColor, onChange }) {
 *   const { color, getGradientObject, handleColorChange } = useColorPickerState({
 *     defaultColor,
 *     onChange
 *   });
 *
 *   return (
 *     <ReactColorPicker
 *       value={color}
 *       onChange={handleColorChange}
 *     />
 *   );
 * }
 * ```
 */
export function useColorPickerState({
	defaultColor,
	onChange,
}: UseColorPickerStateProps): UseColorPickerStateReturn {
	const [color, setColor] = useState<string>(
		defaultColor ? colorTypeToPickerString(defaultColor) : '#000000',
	);

	const { getGradientObject, deletePoint } = useColorPicker(color, setColor);
	const [debouncedColor] = useDebouncedValue(color, COLOR_PICKER_CONFIG.DEBOUNCE_DELAY);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		const colorObject = pickerStringToColorType(debouncedColor, getGradientObject);
		onChangeRef.current(colorObject);
	}, [debouncedColor]);

	const handleColorChange = useCallback(
		(newColor: string) => {
			const normalizedColor = normalizeGradientString(newColor);
			setColor(normalizedColor);
			const gradientObject = getGradientObject(normalizedColor) as GradientObject | undefined;
			if (gradientObject?.isGradient && gradientObject.colors.length > 2) {
				deletePoint(1);
			}
		},
		[getGradientObject, deletePoint],
	);

	return {
		color,
		getGradientObject,
		handleColorChange,
	};
}
