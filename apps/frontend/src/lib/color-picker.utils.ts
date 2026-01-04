/**
 * Color Picker Utility Functions
 *
 * Utilities for converting between TColorOrGradient type and
 * react-best-gradient-color-picker string format.
 */

import type { TColorOrGradient } from '@shared/schemas';
import { rgbaToHex } from './utils';

export interface ColorStop {
	value: string;
	left: number;
}

/**
 * Type definition for gradient object from react-best-gradient-color-picker
 * This represents the parsed structure of a gradient string
 */
export interface GradientObject {
	isGradient: boolean;
	gradientType?: string | null;
	degrees: string | null;
	/** Array of color stops with their positions */
	colors: ColorStop[];
}

/**
 * Function type for getGradientObject from useColorPicker hook
 */
export type GetGradientObjectFn = (color: string) => GradientObject | undefined;

/**
 * Converts TColorOrGradient type to CSS string format
 * used by react-best-gradient-color-picker
 *
 * @param color - The color object to convert
 * @returns CSS string representation of the color
 *
 * @example
 * // Solid color
 * colorTypeToPickerString({ type: 'hex', value: '#ff0000' })
 * // Returns: '#ff0000'
 *
 * @example
 * // Gradient
 * colorTypeToPickerString({
 *   type: 'gradient',
 *   gradientType: 'linear',
 *   rotation: 90,
 *   colorStops: [
 *     { offset: 0, color: '#ff0000' },
 *     { offset: 1, color: '#0000ff' }
 *   ]
 * })
 * // Returns: 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)'
 */
export function colorTypeToPickerString(color: TColorOrGradient): string {
	switch (color.type) {
		case 'hex':
		case 'rgba':
			return color.value;
		case 'gradient': {
			const gradientType = color.gradientType === 'linear' ? 'linear-gradient' : 'radial-gradient';
			const validStops = color.colorStops.filter(
				(stop) => stop.color && typeof stop.color === 'string',
			);

			// Ensure we have at least 2 color stops for a valid gradient
			if (validStops.length < 2) {
				// Fallback to first valid color or black
				const fallbackColor = validStops[0]?.color || '#000000';
				return fallbackColor;
			}

			const colorStops = validStops
				.map((stop) => {
					// Ensure offset is a valid number, default to 0 if NaN
					const offset = Number.isFinite(stop.offset) ? stop.offset : 0;
					return `${stop.color} ${offset * 100}%`;
				})
				.join(', ');
			const rotation = Number.isFinite(color.rotation) ? color.rotation : 0;
			return `${gradientType}(${rotation}deg, ${colorStops})`;
		}
	}
}

/**
 * Converts CSS string from react-best-gradient-color-picker
 * to TColorOrGradient type
 *
 * @param color - CSS color string
 * @param getGradientObject - Function to parse gradient strings
 * @returns Typed color object
 *
 * @example
 * // Solid hex color
 * pickerStringToColorType('#ff0000', getGradientObject)
 * // Returns: { type: 'hex', value: '#ff0000' }
 *
 * @example
 * // RGBA color
 * pickerStringToColorType('rgba(255, 0, 0, 0.5)', getGradientObject)
 * // Returns: { type: 'rgba', value: 'rgba(255, 0, 0, 0.5)' }
 *
 * @example
 * // Gradient
 * pickerStringToColorType('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)', getGradientObject)
 * // Returns: { type: 'gradient', gradientType: 'linear', rotation: 90, colorStops: [...] }
 */
export function pickerStringToColorType(
	color: string,
	getGradientObject: GetGradientObjectFn,
): TColorOrGradient {
	const gradientObject = getGradientObject(color);

	// Handle gradient colors
	if (gradientObject?.isGradient) {
		const rotation = gradientObject.degrees ? parseFloat(gradientObject.degrees) : 0;
		return {
			type: 'gradient',
			gradientType: gradientObject.gradientType === 'linear-gradient' ? 'linear' : 'radial',
			rotation: Number.isFinite(rotation) ? rotation : 0,
			colorStops: gradientObject.colors.map((stop) => {
				// Ensure stop.left is a valid number, default to 0 if NaN
				const left = Number.isFinite(stop.left) ? stop.left : 0;
				return {
					offset: left / 100,
					color: rgbaToHex(stop.value, true),
				};
			}),
		};
	}

	// Handle solid colors
	if (color.startsWith('#')) {
		return { type: 'hex', value: color };
	}

	return { type: 'rgba', value: color };
}

/**
 * Converts TColorOrGradient to human-readable text for button display
 *
 * @param color - The color object to display
 * @returns Human-readable color description
 *
 * @example
 * colorToButtonText({ type: 'hex', value: '#ff0000' })
 * // Returns: '#ff0000'
 *
 * @example
 * colorToButtonText({
 *   type: 'gradient',
 *   gradientType: 'linear',
 *   rotation: 90,
 *   colorStops: [
 *     { offset: 0, color: '#ff0000' },
 *     { offset: 1, color: '#0000ff' }
 *   ]
 * })
 * // Returns: '#ff0000 -> #0000ff'
 */
export function colorToButtonText(color: TColorOrGradient): string {
	switch (color.type) {
		case 'hex':
		case 'rgba':
			return color.value;
		case 'gradient':
			return color.colorStops.map((stop) => stop.color).join(' -> ');
	}
}

/**
 * Normalizes gradient strings to ensure proper rotation format
 *
 * The react-best-gradient-color-picker sometimes generates invalid
 * gradient strings missing rotation degrees. This function fixes them.
 *
 * @param gradientString - The gradient string to normalize
 * @returns Normalized gradient string with proper rotation
 *
 * @example
 * // Missing degrees
 * normalizeGradientString('linear-gradient(deg, #ff0000 0%, #0000ff 100%)')
 * // Returns: 'linear-gradient(0deg, #ff0000 0%, #0000ff 100%)'
 *
 * @example
 * // Double comma issue
 * normalizeGradientString('linear-gradient(90deg,deg, #ff0000 0%)')
 * // Returns: 'linear-gradient(90deg, #ff0000 0%)'
 */
export function normalizeGradientString(gradientString: string): string {
	let normalized = gradientString;

	// Fix missing rotation degrees (e.g., "linear-gradient(deg" -> "linear-gradient(0deg,")
	if (
		normalized.startsWith('linear-gradient(deg') ||
		normalized.startsWith('radial-gradient(deg')
	) {
		normalized = normalized.replace(/(linear-gradient|radial-gradient)\((?!\d+deg)/, '$1(0deg,');
	}

	// Fix double comma issue (e.g., ",deg," -> ",")
	normalized = normalized.replace(/,deg,/, ',');

	// Fix NaN% in color stops (e.g., "NaN%" -> "0%")
	normalized = normalized.replace(/NaN%/g, '0%');

	return normalized;
}
