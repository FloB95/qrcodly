import {
	Cormorant_Garamond,
	DM_Sans,
	DM_Serif_Display,
	Fraunces,
	IBM_Plex_Mono,
	IBM_Plex_Sans,
	Inter,
	Lora,
	Manrope,
	Montserrat,
	Mulish,
	Nunito_Sans,
	Open_Sans,
	Outfit,
	Playfair_Display,
	Source_Sans_3,
	Space_Grotesk,
} from 'next/font/google';

/**
 * Ten curated pairings (display + body) plus a mono face for labels. Exposed as CSS variables;
 * `globals.css` maps each pairing to a `hp-pair-*` utility and the page uses `font-hp-*`.
 * The pairing utilities must not start with `font-`: tailwind-merge would treat them as a font
 * family and drop `font-hp-body` next to them. Nothing is preloaded, as every generator and page
 * would otherwise fetch all families; a page loads the two faces it actually uses.
 */
const playfair = Playfair_Display({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-playfair',
});
const sourceSans = Source_Sans_3({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-source-sans',
});
const fraunces = Fraunces({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-fraunces',
	axes: ['opsz', 'SOFT'],
});
const dmSans = DM_Sans({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-dm-sans',
});
const lora = Lora({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-lora',
});
const nunitoSans = Nunito_Sans({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-nunito-sans',
});
const spaceGrotesk = Space_Grotesk({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-space-grotesk',
});
const plexSans = IBM_Plex_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-plex-sans',
});
const plexMono = IBM_Plex_Mono({
	subsets: ['latin'],
	weight: ['400', '500'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-plex-mono',
});
const manrope = Manrope({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-manrope',
});
const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-inter',
});

const cormorant = Cormorant_Garamond({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-cormorant',
});
const mulish = Mulish({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-mulish',
});
const dmSerif = DM_Serif_Display({
	subsets: ['latin'],
	weight: '400',
	display: 'swap',
	preload: false,
	variable: '--font-hp-dm-serif',
});
const outfit = Outfit({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-outfit',
});
const montserrat = Montserrat({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-montserrat',
});
const openSans = Open_Sans({
	subsets: ['latin'],
	display: 'swap',
	preload: false,
	variable: '--font-hp-open-sans',
});

export const hostedFontVariables = [
	playfair,
	sourceSans,
	fraunces,
	dmSans,
	lora,
	nunitoSans,
	spaceGrotesk,
	plexSans,
	plexMono,
	manrope,
	inter,
	cormorant,
	mulish,
	dmSerif,
	outfit,
	montserrat,
	openSans,
]
	.map((font) => font.variable)
	.join(' ');
