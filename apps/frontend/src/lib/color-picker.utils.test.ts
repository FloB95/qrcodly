import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactColorPicker, { useColorPicker } from 'react-best-gradient-color-picker';
import { describe, expect, it } from 'vitest';
import { ColorOrGradient, type TColorOrGradient } from '@shared/schemas';
import {
	colorTypeToPickerString,
	normalizePickerString,
	pickerStringToColorType,
} from './color-picker.utils';

type Gradient = Extract<TColorOrGradient, { type: 'gradient' }>;

const gradient = (
	gradientType: Gradient['gradientType'],
	rotation: number | null,
	[from, to]: [number, number] = [0, 1],
	colors: [string, string] = ['#cc0000', '#721d03'],
): Gradient => ({
	type: 'gradient',
	gradientType,
	rotation,
	colorStops: [
		{ offset: from, color: colors[0] },
		{ offset: to, color: colors[1] },
	],
});

const linear = (rotation: number, from = 20, to = 80) =>
	gradient('linear', rotation, [from / 100, to / 100]);

/** How the picker library itself reads a value; throws where the picker would crash the page. */
function readWithPicker(value: string) {
	let picker: ReturnType<typeof useColorPicker> | undefined;
	function Probe() {
		picker = useColorPicker(value, () => {});
		return null;
	}
	renderToStaticMarkup(createElement(Probe));
	renderToStaticMarkup(createElement(ReactColorPicker, { value, onChange: () => {} }));
	return picker!.getGradientObject(value)!;
}

const libraryColorToHex = (value: string) =>
	`#${(/\(([^)]*)\)/.exec(value)?.[1] ?? '')
		.split(',')
		.slice(0, 3)
		.map((channel) => Number(channel).toString(16).padStart(2, '0'))
		.join('')}`;

/** Asserts the picker accepts the string and reads it exactly like pickerStringToColorType does. */
function expectPickerAgrees(value: string): TColorOrGradient {
	const stored = pickerStringToColorType(value);
	expect(ColorOrGradient.safeParse(stored).error).toBeUndefined();

	const read = readWithPicker(value);
	if (stored.type !== 'gradient') {
		expect(read.isGradient).toBe(false);
		return stored;
	}
	expect(read.isGradient).toBe(true);
	expect(read.gradientType).toBe(`${stored.gradientType}-gradient`);
	if (stored.gradientType === 'linear') expect(read.degrees).toBe(`${stored.rotation}deg`);
	expect(
		read.colors.map((stop: { value: string; left: number }) => ({
			offset: stop.left / 100,
			color: libraryColorToHex(stop.value),
		})),
	).toEqual(stored.colorStops);
	return stored;
}

describe('stored color -> picker -> stored', () => {
	it('opens the radial gradient that crashed the edit page', () => {
		const stored = gradient('radial', 0, [0.63, 1]);
		const value = colorTypeToPickerString(stored);

		expect(value).toBe('radial-gradient(circle, #cc0000 63%, #721d03 100%)');
		expect(expectPickerAgrees(value)).toEqual(stored);
	});

	it.each([null, 0, 90, -10, 0.5])('opens radial gradients with rotation %s', (rotation) => {
		expect(expectPickerAgrees(colorTypeToPickerString(gradient('radial', rotation)))).toEqual(
			gradient('radial', 0),
		);
	});

	it.each([0, 1, 45, 90, 135, 180, 225, 270, 315, 359])('keeps linear rotation %s', (rotation) => {
		const stored = gradient('linear', rotation);
		expect(expectPickerAgrees(colorTypeToPickerString(stored))).toEqual(stored);
	});

	it.each([
		[null, 90],
		[360, 0],
		[720, 0],
		[-45, 315],
		[12.5, 13],
		[1e-7, 0],
		[1e21, 1e21 % 360],
	])('maps linear rotation %s to the equivalent angle %s', (rotation, expected) => {
		expect(expectPickerAgrees(colorTypeToPickerString(gradient('linear', rotation)))).toEqual(
			gradient('linear', expected),
		);
	});

	it('keeps every offset the picker can produce', () => {
		for (let percent = 0; percent <= 100; percent++) {
			const stored = gradient('linear', 90, [percent / 100, (100 - percent) / 100]);
			expect(expectPickerAgrees(colorTypeToPickerString(stored))).toEqual(stored);
		}
	});

	it.each([
		[
			[1e-9, 1],
			[0, 1],
		],
		[
			[0, 2e21],
			[0, 1],
		],
		[
			[-0.1, 1.5],
			[0, 1],
		],
		[
			[0.333, 0.635],
			[0.33, 0.64],
		],
		[
			[1, 0],
			[1, 0],
		],
	] as [[number, number], [number, number]][])(
		'opens API offsets %j as %j',
		(offsets, expected) => {
			expect(expectPickerAgrees(colorTypeToPickerString(gradient('linear', 90, offsets)))).toEqual(
				gradient('linear', 90, expected),
			);
		},
	);

	it('lowercases upper-case stop colors', () => {
		const value = colorTypeToPickerString(gradient('linear', 90, [0, 1], ['#CC0000', '#721D03']));
		expect(expectPickerAgrees(value)).toEqual(gradient('linear', 90));
	});

	it.each([
		'#cc0000',
		'#DFFF00',
		'rgba(1, 2, 3, 0.5)',
		'rgba(1,2,3,0.5)',
		'rgb(1, 2, 3)',
		'rgb(1,2,3,0.5)',
		'RGBA(1,2,3,.5)',
	])('passes the solid color %s through unchanged', (value) => {
		const stored = ColorOrGradient.parse(
			value.startsWith('#') ? { type: 'hex', value } : { type: 'rgba', value },
		);
		expect(colorTypeToPickerString(stored)).toBe(value);
		readWithPicker(value);
	});
});

describe('picker output -> stored -> picker', () => {
	it.each([
		// solid: square, hue, opacity, eyedropper, presets, solid button
		['rgb(187, 118, 118)', { type: 'rgba', value: 'rgb(187, 118, 118)' }],
		['rgba(187, 118, 118, 0.48)', { type: 'rgba', value: 'rgba(187, 118, 118, 0.48)' }],
		['rgba(204, 86, 0, 0.33299999999999996)', { type: 'rgba', value: 'rgba(204, 86, 0, 0.33)' }],
		['#DFFF00', { type: 'hex', value: '#dfff00' }],
		['rgba(175, 51, 242, 1)', { type: 'rgba', value: 'rgba(175, 51, 242, 1)' }],
		// solid: decimals and exponents from the R/G/B, A and CMYK inputs
		['rgba(254.9, 0, 0, 1)', { type: 'rgba', value: 'rgba(255, 0, 0, 1)' }],
		['rgba(183.60000000000002, 0, 0, 1)', { type: 'rgba', value: 'rgba(184, 0, 0, 1)' }],
		['rgba(1e-7, 0, 0, 1)', { type: 'rgba', value: 'rgba(0, 0, 0, 1)' }],
		['rgba(2.2648549702353193e-14, 255, 0, 1)', { type: 'rgba', value: 'rgba(0, 255, 0, 1)' }],
		['rgba(100, 0, 0, 9.999999999999999e-10)', { type: 'rgba', value: 'rgba(100, 0, 0, 0)' }],
		['rgba(0, 0, 0, NaN)', { type: 'rgba', value: 'rgba(0, 0, 0, 1)' }],
	] as [string, TColorOrGradient][])('stores the solid color %s as %j', (emitted, expected) => {
		const value = normalizePickerString(emitted);
		expect(expectPickerAgrees(value)).toEqual(expected);
		expect(normalizePickerString(colorTypeToPickerString(expected))).toBe(
			colorTypeToPickerString(expected),
		);
	});

	it.each([
		// type switches and the default gradient
		[
			'linear-gradient(90deg, #ffa647 0%, #cd93ff 100%)',
			gradient('linear', 90, [0, 1], ['#ffa647', '#cd93ff']),
		],
		[
			'radial-gradient(circle,  RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)',
			gradient('radial', 0, [0.2, 0.8]),
		],
		// degree input: raw text is spliced into the string
		['linear-gradient(45deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(45)],
		['linear-gradient(45.5deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(46)],
		['linear-gradient(.5deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(1)],
		['linear-gradient(90.deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(90)],
		['linear-gradient(007deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(7)],
		['linear-gradient( 45deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(45)],
		['linear-gradient(45 deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(45)],
		['linear-gradient(+45deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(45)],
		['linear-gradient(1e2deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(100)],
		['linear-gradient(1e-7deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(0)],
		['linear-gradient(0x10deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(0)],
		['linear-gradient(deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(0)],
		['linear-gradient( deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(0)],
		['linear-gradient(NaNdeg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(0)],
		['linear-gradient(90deg,deg, RGBA(204, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)', linear(90)],
		// stop edits in gradient mode: upper-cased, unrounded numbers
		[
			'linear-gradient(90deg, RGBA(1E-7, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)',
			gradient('linear', 90, [0.2, 0.8], ['#000000', '#721d03']),
		],
		[
			'linear-gradient(90deg, RGBA(183.60000000000002, 0, 0, 1) 20%, rgba(114, 29, 3, 1) 80%)',
			gradient('linear', 90, [0.2, 0.8], ['#b80000', '#721d03']),
		],
		[
			'linear-gradient(90deg, RGBA(204, 0, 0, 9.999999999999999E-10) 20%, rgba(114, 29, 3, 1) 80%)',
			linear(90),
		],
		['linear-gradient(90deg, RGBA(204, 0, 0, NAN) 20%, rgba(114, 29, 3, 1) 80%)', linear(90)],
		[
			'linear-gradient(90deg, #DFFF00 20%, rgba(114, 29, 3, 1) 80%)',
			gradient('linear', 90, [0.2, 0.8], ['#dfff00', '#721d03']),
		],
		// positions
		[
			'linear-gradient(90deg, rgba(0, 0, 0, 1) NaN%, RGBA(114, 29, 3, 1) 80%)',
			gradient('linear', 90, [0, 0.8], ['#000000', '#721d03']),
		],
		[
			'linear-gradient(90deg, RGBA(204, 0, 0, 1) 28.999999999999996%, rgba(114, 29, 3, 1) 1.0000000000000001e-7%)',
			linear(90, 29, 0),
		],
	] as [string, Gradient][])('stores %s', (emitted, expected) => {
		const value = normalizePickerString(emitted);
		expect(expectPickerAgrees(value)).toEqual(expected);

		const reopened = colorTypeToPickerString(expected);
		expect(expectPickerAgrees(normalizePickerString(reopened))).toEqual(expected);
	});

	it.each(['#DFFF00', '#000000'])('keeps the preset %s on the selected stop selected', (preset) => {
		const value = normalizePickerString(
			`linear-gradient(90deg, rgba(204, 0, 0, 1) 20%, ${preset} 80%)`,
		);
		expect(value).toMatch(/^linear-gradient\(90deg, rgba\(204, 0, 0, 1\) 20%, RGBA\(/);
		expectPickerAgrees(value);
	});

	it('is idempotent', () => {
		const value = normalizePickerString(
			'linear-gradient(45.5deg, RGBA(183.6, 0, 0, 0.5) 28.999999999999996%, rgba(114,29,3,1) 80%)',
		);
		expect(normalizePickerString(value)).toBe(value);
	});
});

describe('clicking the gradient bar (adds a third stop)', () => {
	it('moves the selected stop to the click instead of adding one', () => {
		const value = normalizePickerString(
			'linear-gradient(90deg, rgba(204, 0, 0, 1) 20%, RGBA(204, 0, 0, 1) 50%, rgba(114, 29, 3, 1) 80%)',
		);
		expect(value).toBe('linear-gradient(90deg, RGBA(204, 0, 0, 1) 50%, rgba(114, 29, 3, 1) 80%)');
		expect(expectPickerAgrees(value)).toEqual(linear(90, 50, 80));
	});

	it('keeps both colors when clicking on the last stop', () => {
		const value = normalizePickerString(
			'linear-gradient(90deg, rgba(255, 166, 71, 1) 0%, rgba(205, 147, 255, 1) 100%, RGBA(205, 147, 255, 1) 100%)',
		);
		expect(expectPickerAgrees(value)).toEqual(
			gradient('linear', 90, [0, 1], ['#ffa647', '#cd93ff']),
		);
	});

	it('keeps both colors when clicking left of the first stop', () => {
		const value = normalizePickerString(
			'linear-gradient(90deg, RGBA(205, 147, 255, 1) 20%, rgba(255, 166, 71, 1) 40%, rgba(205, 147, 255, 1) 100%)',
		);
		expect(expectPickerAgrees(value)).toEqual(
			gradient('linear', 90, [0.2, 0.4], ['#cd93ff', '#ffa647']),
		);
	});

	it('falls back to the outer stops when no stop is selected', () => {
		const value = normalizePickerString(
			'linear-gradient(90deg, rgba(2,0,36,1) 0%, rgba(9,9,121,1) 35%, rgba(0,212,255,1) 100%)',
		);
		expect(expectPickerAgrees(value)).toEqual(
			gradient('linear', 90, [0, 1], ['#020024', '#00d4ff']),
		);
	});
});
