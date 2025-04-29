import { env } from '@/env';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import qs from 'qs';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getShortUrlFromCode(code: string): string {
	return `${env.NEXT_PUBLIC_FRONTEND_URL}/u/${code}`;
}

export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

export function toSnakeCase(str: string) {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toSnakeCaseKeys(obj: object) {
	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [toSnakeCase(key), value]),
	);
}

export const svgToBase64 = (svgString: string): string => {
	const base64 = window.btoa(svgString);
	return `data:image/svg+xml;base64,${base64}`;
};

export const formatDate = (date: Date | string): string => {
	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(date));
};

/**
 * Compares two values for deep equality.
 * @param {*} value1 - The first value to compare.
 * @param {*} value2 - The second value to compare.
 * @returns {boolean} - Returns true if the values are deeply equal, otherwise false.
 */
function deepEqual(value1: unknown, value2: unknown): boolean {
	// Check if both values are objects (arrays or objects)
	if (typeof value1 === 'object' && typeof value2 === 'object') {
		return JSON.stringify(value1) === JSON.stringify(value2);
	}
	// For non-objects, use strict equality
	return value1 === value2;
}

/**
 * Computes the difference between two objects.
 * @param {Object} obj1 - The first object.
 * @param {Object} obj2 - The second object.
 * @param {Array<string>} [ignoreProperties=[]] - An array of property names to ignore.
 * @returns {Object} - An object representing the differences. Each key in the returned object
 *                     corresponds to a property that differs between obj1 and obj2, with the
 *                     old and new values.
 */
export function objDiff(
	obj1: Record<string, unknown>,
	obj2: Record<string, unknown>,
	ignoreProperties: string[] = [],
) {
	const diff: Record<string, { oldValue: unknown; newValue: unknown }> = {};

	for (const key in obj1) {
		// Skip the properties in the ignoreProperties array
		if (ignoreProperties.includes(key)) {
			continue;
		}
		// Compare the properties using deepEqual
		if (!deepEqual(obj1[key], obj2[key])) {
			diff[key] = {
				oldValue: obj1[key],
				newValue: obj2[key],
			};
		}
	}

	return diff;
}

/**
 * Converts an RGBA color string to a hexadecimal color string.
 * @param {string} colorStr - The RGBA color string (e.g., "rgba(255, 0, 0, 0.5)").
 * @param {boolean} [forceRemoveAlpha=false] - If true, removes the alpha value from the output.
 * @returns {string} - The hexadecimal color string (e.g., "#ff0000").
 */
export function rgbaToHex(colorStr: string, forceRemoveAlpha = false): string {
	// Check if the input string contains '/'
	const hasSlash = colorStr.includes('/');

	if (hasSlash) {
		// Extract the RGBA values from the input string
		const rgbaRegex = /(\d+)\s+(\d+)\s+(\d+)\s+\/\s+([\d.]+)/;
		const rgbaValues = rgbaRegex.exec(colorStr);

		if (!rgbaValues) {
			return colorStr; // Return the original string if it doesn't match the expected format
		}

		const [red, green, blue, alpha] = rgbaValues.slice(1, 5).map(parseFloat);

		// Convert the RGB values to hexadecimal format
		const redHex = red?.toString(16).padStart(2, '0');
		const greenHex = green?.toString(16).padStart(2, '0');
		const blueHex = blue?.toString(16).padStart(2, '0');

		// Convert alpha to a hexadecimal format (assuming it's already a decimal value in the range [0, 1])
		const alphaHex = forceRemoveAlpha
			? ''
			: Math.round((alpha ?? 0) * 255)
					.toString(16)
					.padStart(2, '0');

		// Combine the hexadecimal values to form the final hex color string
		const hexColor = `#${redHex}${greenHex}${blueHex}${alphaHex}`;

		return hexColor;
	} else {
		// Use the second code block for the case when '/' is not present
		return (
			'#' +
			colorStr
				.replace(/^rgba?\(|\s+|\)$/g, '') // Get's rgba / rgb string values
				.split(',') // splits them at ","
				.filter((_string, index) => !forceRemoveAlpha || index !== 3)
				.map((string) => parseFloat(string)) // Converts them to numbers
				.map((number, index) =>
					index === 3 ? Math.round(number * 255) : number,
				) // Converts alpha to 255 number
				.map((number) => number.toString(16)) // Converts numbers to hex
				.map((string) => (string.length === 1 ? '0' + string : string)) // Adds 0 when length of one number is 1
				.join('')
		);
	}
}

// API request helper
export async function apiRequest<T>(
	endpoint: string,
	options: RequestInit,
	queryParams?: Record<string, unknown>,
): Promise<T> {
	// Construct query string if queryParams are provided
	const queryString = queryParams ? `?${qs.stringify(queryParams)}` : '';
	const response = await fetch(
		`${env.NEXT_PUBLIC_API_URL}${endpoint}${queryString}`,
		options,
	);

	if (!response.ok) {
		const errorBody = (await response.json().catch(() => ({}))) as Record<
			string,
			unknown
		>;
		throw new Error(
			(errorBody?.message as string | undefined) ??
				'An error occurred while fetching data',
		);
	}

	return (await response.json()) as T;
}
