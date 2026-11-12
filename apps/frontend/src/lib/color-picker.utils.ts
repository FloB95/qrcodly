/**
 * Color Picker Utility Functions
 *
 * Converts between the stored TColorOrGradient type and the CSS strings used by
 * react-best-gradient-color-picker. The picker's parser only understands a narrow
 * grammar (integer percentages, plain `Ndeg` angles, no angle on radial gradients,
 * no exponent notation), so every string handed to it goes through these helpers.
 */

import type { TColorOrGradient } from '@shared/schemas';

interface PickerStop {
	color: string;
	left: number;
}

interface PickerGradient {
	type: 'linear' | 'radial';
	angle: number;
	stops: PickerStop[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toInt = (value: number, min: number, max: number) =>
	Number.isFinite(value) ? clamp(Math.round(value), min, max) : min;

const toAlpha = (value: number) =>
	Number.isFinite(value) ? Number(clamp(value, 0, 1).toFixed(2)) : 1;

/** Any finite angle as an equivalent whole number of degrees in [0, 360). */
const toAngle = (degrees: number) => ((Math.round(degrees) % 360) + 360) % 360;

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(value: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < value.length; i++) {
		const char = value[i];
		if (char === '(') depth++;
		else if (char === ')') depth--;
		else if (char === ',' && depth === 0) {
			parts.push(value.slice(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(value.slice(start).trim());
	return parts;
}

const STOP_PATTERN = /^(rgba?\([^)]*\)|#[0-9a-f]{3,8})(?:\s+(\S+)%)?$/i;

function parseGradient(value: string): PickerGradient | null {
	const match = /^\s*(linear|radial)-gradient\(([\s\S]*)\)\s*$/i.exec(value);
	if (!match) return null;

	const [orientation = '', ...rest] = splitTopLevel(match[2] ?? '');
	const stops = [orientation, ...rest].flatMap((part) => {
		const stop = STOP_PATTERN.exec(part);
		return stop ? [{ color: stop[1] ?? '', left: parseFloat(stop[2] ?? '') }] : [];
	});

	return {
		type: match[1]?.toLowerCase() === 'radial' ? 'radial' : 'linear',
		angle: /deg$/i.test(orientation) ? parseFloat(orientation) : NaN,
		stops,
	};
}

function formatGradient({ type, angle, stops }: PickerGradient): string {
	const colorStops = stops.map((stop) => `${stop.color} ${stop.left}%`).join(', ');
	return type === 'radial'
		? `radial-gradient(circle, ${colorStops})`
		: `linear-gradient(${angle}deg, ${colorStops})`;
}

/** Rewrites every rgb()/rgba() to whole channels in [0, 255] and an alpha with at most two decimals. */
function normalizeRgb(value: string): string {
	return value.replace(/(rgba?)\(([^)]*)\)/gi, (match, fn: string, args: string) => {
		const values = args.split(',').map(Number.parseFloat);
		if (values.length < 3) return match;
		const rgb = values
			.slice(0, 3)
			.map((channel) => toInt(channel, 0, 255))
			.join(', ');
		return values.length > 3 ? `${fn}(${rgb}, ${toAlpha(values[3] ?? 1)})` : `${fn}(${rgb})`;
	});
}

/** Converts an rgb()/rgba()/hex color to `#rrggbb`, dropping alpha. */
function toHexColor(color: string): string {
	const rgb = /rgba?\(([^)]*)\)/i.exec(color);
	let channels: number[];
	if (rgb) {
		channels = (rgb[1] ?? '')
			.split(',')
			.slice(0, 3)
			.map((channel) => toInt(parseFloat(channel), 0, 255));
	} else {
		channels = hexChannels(color);
	}
	return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function hexChannels(color: string): number[] {
	const hex = /^#([0-9a-f]{3,8})$/i.exec(color.trim())?.[1] ?? '000000';
	const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join('') : hex;
	return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0);
}

/**
 * The stored gradient has exactly two stops, but clicking the picker's gradient bar adds a
 * third one: a copy of the selected (upper-case) stop at the clicked position. Dropping the
 * original of that copy turns the click into "move the selected stop here" instead of
 * silently losing a color.
 */
function reduceToTwoStops(stops: PickerStop[]): PickerStop[] {
	if (stops.length <= 2) return stops;
	const first = stops[0];
	const last = stops[stops.length - 1];
	const selectedIndex = stops.findIndex((stop) => /^[A-Z]/.test(stop.color));
	const selected = stops[selectedIndex];
	if (stops.length > 3 || !selected || !first || !last)
		return first && last ? [first, last] : stops;

	const others = stops.filter((stop) => stop !== selected);
	const copies = others.filter((stop) => toHexColor(stop.color) === toHexColor(selected.color));
	const distance = (stop: PickerStop) => Math.abs(stop.left - selected.left);
	const drop = (copies.length ? copies : others).reduce((a, b) =>
		distance(b) < distance(a) ? b : a,
	);
	return stops.filter((stop) => stop !== drop);
}

/**
 * Converts the stored color to the string the picker gets as `value`.
 *
 * @example
 * colorTypeToPickerString({ type: 'gradient', gradientType: 'radial', rotation: 0, colorStops: [...] })
 * // 'radial-gradient(circle, #cc0000 63%, #721d03 100%)'
 */
export function colorTypeToPickerString(color: TColorOrGradient): string {
	switch (color.type) {
		case 'hex':
		case 'rgba':
			return color.value;
		case 'gradient':
			return formatGradient({
				type: color.gradientType,
				// null renders like 90deg (left to right), see mapColorOrGradientToLibrary
				angle: toAngle(color.rotation ?? 90),
				stops: color.colorStops.map((stop) => ({
					color: toHexColor(stop.color),
					left: toInt(stop.offset * 100, 0, 100),
				})),
			});
	}
}

/**
 * Normalizes a string emitted by the picker so its own parser and our schema accept it:
 * whole rgb channels, short alphas, a whole angle in [0, 360], whole percentages in
 * [0, 100] and at most two gradient stops. Keeps the upper-case marker the picker uses
 * for the selected stop.
 */
export function normalizePickerString(value: string): string {
	const gradient = parseGradient(value);
	if (!gradient) return normalizeRgb(value);

	// A preset puts a hex color on the selected stop. The picker's parser turns hex into lower-case
	// rgba, which loses its selection mark and makes the next edit change the other stop.
	const marked = gradient.stops.some((stop) => /^[A-Z]/.test(stop.color));
	const selectedHex = marked ? -1 : gradient.stops.findIndex((stop) => stop.color.startsWith('#'));
	const stops = gradient.stops.map((stop, index) => ({
		color: stop.color.startsWith('#')
			? `${index === selectedHex ? 'RGBA' : 'rgba'}(${hexChannels(stop.color).join(', ')}, 1)`
			: normalizeRgb(stop.color),
		left: toInt(stop.left, 0, 100),
	}));
	return formatGradient({
		type: gradient.type,
		angle: toInt(gradient.angle, 0, 360),
		stops: reduceToTwoStops(stops),
	});
}

/**
 * Converts a picker string to the stored color type.
 *
 * @example
 * pickerStringToColorType('linear-gradient(90deg, RGBA(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)')
 * // { type: 'gradient', gradientType: 'linear', rotation: 90, colorStops: [{ offset: 0, color: '#ff0000' }, ...] }
 */
export function pickerStringToColorType(value: string): TColorOrGradient {
	const gradient = parseGradient(value);
	if (gradient) {
		return {
			type: 'gradient',
			gradientType: gradient.type,
			rotation: gradient.type === 'linear' ? toInt(gradient.angle, 0, 360) : 0,
			colorStops: reduceToTwoStops(gradient.stops).map((stop) => ({
				offset: toInt(stop.left, 0, 100) / 100,
				color: toHexColor(stop.color),
			})),
		};
	}

	if (value.startsWith('#')) {
		return { type: 'hex', value: toHexColor(value) };
	}

	return { type: 'rgba', value: normalizeRgb(value) };
}

/**
 * Converts TColorOrGradient to human-readable text for button display
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
