import { type Readable } from 'stream';
import { type z } from 'zod';

/**
 * Asynchronously pauses execution for a specified amount of time.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a random integer within a specified range.
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @returns {number} A random integer within the specified range.
 */
export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Generates a random string of a specified length.
 * @param {number} length - The length of the random string to generate.
 * @returns {string} A random string of the specified length.
 * @example
 * // Generates a random string of length 10
 * const randomStr = randomString(10)
 */
export function randomString(length: number): string {
	let result = '';
	const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

/**
 * Merges two objects of the same type, with the second object overriding unknown overlapping properties of the first.
 * @template T - The type of objects being merged.
 * @param {T} original - The original object to be merged into.
 * @param {Partial<T>} updates - The object containing properties to merge into the original.
 * @returns {T} The merged object.
 */
export function mergeObjects<T>(original: T, updates: Partial<T>): T {
	return {
		...original,
		...updates,
	};
}

/**
 * Merges an array of z.core.$ZodIssue objects, consolidating duplicate errors by combining their paths.
 * @param {z.core.$ZodIssue[]} errors - An array of z.core.$ZodIssue objects to merge.
 * @returns {unknown[]} An array of merged z.core.$ZodIssue objects.
 */
export function mergeZodErrorObjects(errors: z.core.$ZodIssue[]): z.core.$ZodIssue[] {
	const mergedErrors: z.core.$ZodIssue[] = [];

	for (const error of errors) {
		const existingError = mergedErrors.find((e) => {
			const keys = Object.keys(e);
			return keys.every(
				(key) =>
					key === 'path' ||
					(e as unknown as Record<string, unknown>)[key] ===
						(error as unknown as Record<string, unknown>)[key],
			);
		});

		if (existingError) {
			const mergedError: z.core.$ZodIssue = {
				...existingError,
				path: [...existingError.path, ...error.path],
			};
			const index = mergedErrors.indexOf(existingError);
			mergedErrors[index] = mergedError;
		} else {
			mergedErrors.push(error);
		}
	}

	return mergedErrors;
}

export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
	const chunks: unknown[] = [];
	for await (const chunk of stream) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
	}
	return Buffer.concat(chunks as Buffer[]);
};
