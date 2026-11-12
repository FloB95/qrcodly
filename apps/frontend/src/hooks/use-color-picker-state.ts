/**
 * Custom hook for managing ColorPicker state
 *
 * Encapsulates color picker state management, including:
 * - Color state and debouncing
 * - Conversion between TColorOrGradient and picker string format
 * - Normalizing picker output so the picker's own parser and our schema accept it
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { TColorOrGradient } from '@shared/schemas';
import {
	colorTypeToPickerString,
	pickerStringToColorType,
	normalizePickerString,
} from '@/lib/color-picker.utils';
import {
	COLOR_PICKER_CONFIG,
	DEFAULT_GRADIENT,
} from '@/components/qr-generator/style/ColorPicker.constants';

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
	handleColorChange: (newColor: string) => void;
	/** The picker's `config` fallbacks: the user's own colors instead of the picker's samples. */
	pickerDefaults: { defaultColor: string; defaultGradient: string };
}

/**
 * Custom hook for managing ColorPicker state
 *
 * @param props - Hook configuration
 * @returns Color state and handlers
 *
 * @example
 * ```tsx
 * function ColorPicker({ defaultColor, onChange }) {
 *   const { color, handleColorChange } = useColorPickerState({
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
	const [color, setColor] = useState<string>(() =>
		defaultColor ? colorTypeToPickerString(defaultColor) : '#000000',
	);

	const [debouncedColor] = useDebouncedValue(color, COLOR_PICKER_CONFIG.DEBOUNCE_DELAY);
	const onChangeRef = useRef(onChange);
	const hasUserChange = useRef(false);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		// Only report edits: converting the untouched stored value back would rewrite it on mount
		if (!hasUserChange.current) return;
		onChangeRef.current(pickerStringToColorType(debouncedColor));
	}, [debouncedColor]);

	// The picker's Solid/Gradient buttons fall back to its own sample colors, or to a gradient it
	// remembered before later edits. Switching modes brings back what the user last had instead.
	const lastByMode = useRef<{ solid?: string; gradient?: string }>({});

	const handleColorChange = useCallback(
		(newColor: string) => {
			hasUserChange.current = true;
			const current = isGradient(color) ? 'gradient' : 'solid';
			lastByMode.current[current] = color;

			const next = normalizePickerString(newColor);
			const target = isGradient(next) ? 'gradient' : 'solid';
			setColor(target === current ? next : (lastByMode.current[target] ?? next));
		},
		[color],
	);

	const pickerDefaults = useMemo(() => {
		const stored = pickerStringToColorType(color);
		return stored.type === 'gradient'
			? { defaultColor: stored.colorStops[0]?.color ?? '#000000', defaultGradient: color }
			: { defaultColor: color, defaultGradient: DEFAULT_GRADIENT };
	}, [color]);

	return {
		color,
		handleColorChange,
		pickerDefaults,
	};
}

const isGradient = (color: string) => color.includes('gradient(');
