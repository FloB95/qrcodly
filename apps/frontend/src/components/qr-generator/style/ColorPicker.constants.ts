/**
 * ColorPicker dialog and behavior configuration
 */
export const COLOR_PICKER_CONFIG = {
	DIALOG_WIDTH: 320,
	DEBOUNCE_DELAY: 200,
	PICKER_WIDTH: 270,
	PICKER_HEIGHT: 150,
} as const;

/**
 * Preset solid colors available in the color picker
 * Organized for easy selection of common colors
 */
export const SOLID_COLOR_PRESETS = [
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

/**
 * Default gradient shown when gradient mode is first activated
 */
export const DEFAULT_GRADIENT = 'linear-gradient(90deg, #ffa647 0%, #cd93ff 100%)';
