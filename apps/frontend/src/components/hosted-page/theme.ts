import {
	HOSTED_PAGE_DEFAULT_PRIMARY_COLOR,
	HOSTED_PAGE_STYLE_PRESETS,
	type THostedPageFont,
	type THostedPageMode,
	type THostedPageStyle,
	type THostedPageTheme,
} from '@shared/schemas';

/**
 * Every colour on a hosted page is derived from the owner's primary (and optional accent) colour
 * in OKLCH, so the page stays readable whatever they pick: backgrounds are faint tints, text is
 * the same hue pushed to a readable lightness, and button text is white or ink, whichever has the
 * higher contrast. Customers choose colours; they never choose text colours.
 */

type Oklch = { l: number; c: number; h: number };

function hexToRgb(hex: string): [number, number, number] {
	const value = hex.replace('#', '');
	return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [
		number,
		number,
		number,
	];
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function rgbToOklch([r, g, b]: [number, number, number]): Oklch {
	const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const c = Math.sqrt(a * a + bb * bb);
	const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
	return { l: L, c, h };
}

function oklchToHex({ l, c, h }: Oklch): string {
	const a = c * Math.cos((h * Math.PI) / 180);
	const bb = c * Math.sin((h * Math.PI) / 180);
	const l_ = l + 0.3963377774 * a + 0.2158037573 * bb;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * bb;
	const s_ = l - 0.0894841775 * a - 1.291485548 * bb;
	const [l3, m3, s3] = [l_ ** 3, m_ ** 3, s_ ** 3];
	const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
	const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
	const b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
	const clamp = (v: number) => Math.min(1, Math.max(0, toSrgb(v)));
	return (
		'#' +
		[r, g, b]
			.map((v) =>
				Math.round(clamp(v) * 255)
					.toString(16)
					.padStart(2, '0'),
			)
			.join('')
	);
}

/** Relative luminance of sRGB, for the white-or-ink decision on buttons. */
function luminance(hex: string): number {
	const [r, g, b] = hexToRgb(hex);
	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio of two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
	const [la, lb] = [luminance(a), luminance(b)];
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const WHITE = '#ffffff';
const INK = '#0f172a';
/** WCAG AA for normal-size text */
const MIN_TEXT_CONTRAST = 4.5;

export function readableOn(background: string): string {
	return contrastRatio(WHITE, background) >= contrastRatio(INK, background) ? WHITE : INK;
}

/**
 * A button in the given colour and its text. Mid tones reach 4.5:1 with neither white nor ink;
 * they are moved away from the text colour in lightness, keeping hue and chroma, until they do.
 */
function buttonColors(hex: string): { background: string; text: string } {
	const text = readableOn(hex);
	const base = rgbToOklch(hexToRgb(hex));
	const step = text === WHITE ? -0.01 : 0.01;
	let background = hex;
	let l = base.l;
	while (contrastRatio(text, background) < MIN_TEXT_CONTRAST) {
		l += step;
		if (l <= 0 || l >= 1) return { background: text === WHITE ? '#000000' : WHITE, text };
		background = oklchToHex({ ...base, l });
	}
	return { background, text };
}

const shade = (base: Oklch, l: number, chromaScale = 1): string =>
	oklchToHex({ l, c: Math.min(base.c * chromaScale, 0.12), h: base.h });

export type HostedPageVars = Record<`--hp-${string}`, string>;

export type ResolvedTheme = {
	style: THostedPageStyle;
	mode: THostedPageMode;
	font: THostedPageFont;
	/** Utility class that sets the display and body faces of the pairing */
	fontClass: string;
	vars: HostedPageVars;
};

/** CSS variables for the page from the owner's theme choices. */
/** Spelled out so Tailwind finds every pairing utility in the source. */
export const FONT_PAIR_CLASS: Record<THostedPageFont, string> = {
	playfair: 'hp-pair-playfair',
	fraunces: 'hp-pair-fraunces',
	lora: 'hp-pair-lora',
	grotesk: 'hp-pair-grotesk',
	manrope: 'hp-pair-manrope',
	inter: 'hp-pair-inter',
	cormorant: 'hp-pair-cormorant',
	dmserif: 'hp-pair-dmserif',
	outfit: 'hp-pair-outfit',
	montserrat: 'hp-pair-montserrat',
};

export function resolveHostedTheme(theme: THostedPageTheme | undefined): ResolvedTheme {
	const primaryHex = theme?.primaryColor ?? HOSTED_PAGE_DEFAULT_PRIMARY_COLOR;
	const accentHex = theme?.accentColor ?? primaryHex;
	const style = theme?.style ?? 'editorial';
	const mode = theme?.mode ?? 'light';
	const font = theme?.font ?? HOSTED_PAGE_STYLE_PRESETS[style].font;
	const primary = rgbToOklch(hexToRgb(primaryHex));
	const accent = rgbToOklch(hexToRgb(accentHex));
	const dark = mode === 'dark';

	// buttons keep the owner's colour, lifted in dark mode where a dark one would vanish
	const primaryButton = buttonColors(dark && primary.l < 0.55 ? shade(primary, 0.68) : primaryHex);
	const accentButton = buttonColors(dark && accent.l < 0.55 ? shade(accent, 0.68) : accentHex);

	const vars: HostedPageVars = {
		'--hp-primary': primaryButton.background,
		'--hp-on-primary': primaryButton.text,
		'--hp-accent': accentButton.background,
		'--hp-on-accent': accentButton.text,
		'--hp-bg': dark ? shade(primary, 0.17, 0.5) : shade(primary, 0.975, 0.35),
		'--hp-surface': dark ? shade(primary, 0.23, 0.45) : '#ffffff',
		'--hp-surface-2': dark ? shade(primary, 0.29, 0.45) : shade(primary, 0.95, 0.45),
		'--hp-line': dark ? shade(primary, 0.34, 0.4) : shade(primary, 0.9, 0.4),
		'--hp-text': dark ? shade(primary, 0.95, 0.1) : shade(primary, 0.2, 0.3),
		'--hp-text-muted': dark ? shade(primary, 0.74, 0.15) : shade(primary, 0.46, 0.3),
		'--hp-ink': dark ? shade(accent, 0.8) : shade(accent, 0.42),
	};

	return { style, mode, font, fontClass: FONT_PAIR_CLASS[font], vars };
}

/** Shape and type tokens that make the three presets feel different without touching layout code. */
export const STYLE_TOKENS: Record<
	THostedPageStyle,
	{ radius: string; radiusLarge: string; button: string; eyebrow: string }
> = {
	editorial: {
		radius: 'rounded-full',
		radiusLarge: 'rounded-[1.25rem]',
		button: 'h-12 rounded-full text-[15px] tracking-wide',
		eyebrow: 'font-hp-body text-[11px] font-semibold tracking-[0.22em] uppercase',
	},
	gallery: {
		radius: 'rounded-xl',
		radiusLarge: 'rounded-2xl',
		button: 'h-12 rounded-xl text-[15px]',
		eyebrow: 'font-hp-body text-[11px] font-semibold tracking-[0.16em] uppercase',
	},
	technical: {
		radius: 'rounded-md',
		radiusLarge: 'rounded-lg',
		button: 'h-11 rounded-lg text-sm',
		eyebrow: 'font-hp-mono text-[11px] font-medium tracking-[0.08em] uppercase',
	},
};
