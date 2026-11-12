import { readFileSync } from 'fs';
import { join } from 'path';
import { QrCodeDefaults, type TQrCodeOptions } from '@shared/schemas';

const LOGO_MIME_TYPES = {
	png: 'image/png',
	svg: 'image/svg+xml',
	jpg: 'image/jpeg',
	webp: 'image/webp',
} as const;

export type TGoldenLogo = keyof typeof LOGO_MIME_TYPES;

export type TGoldenCase = {
	/** File name of the reference image. */
	id: string;
	data: string;
	config: TQrCodeOptions;
	/** golden/logo.<extension> */
	logo?: TGoldenLogo;
};

export const GOLDEN_DIR = __dirname;

export const goldenLogo = (logo: TGoldenLogo) => {
	const buffer = readFileSync(join(GOLDEN_DIR, `logo.${logo}`));
	return { buffer, dataUrl: `data:${LOGO_MIME_TYPES[logo]};base64,${buffer.toString('base64')}` };
};

const hex = (value: string) => ({ type: 'hex' as const, value });
const rgba = (value: string) => ({ type: 'rgba' as const, value });
const gradient = (
	gradientType: 'linear' | 'radial',
	rotation: number | null,
	[from, to]: [string, string],
	[fromOffset, toOffset]: [number, number] = [0, 1],
) => ({
	type: 'gradient' as const,
	gradientType,
	rotation,
	colorStops: [
		{ offset: fromOffset, color: from },
		{ offset: toOffset, color: to },
	],
});

const base = (overrides: Partial<TQrCodeOptions>): TQrCodeOptions => ({
	...QrCodeDefaults,
	width: 400,
	height: 400,
	...overrides,
});

const URL_DATA = 'https://www.qrcodly.de/';
const VCARD_DATA = [
	'BEGIN:VCARD',
	'VERSION:3.0',
	'N:Mustermann;Erika;;;',
	'FN:Erika Mustermann',
	'ORG:QRcodly Golden Image GmbH',
	'TITLE:Head of Rendering',
	'TEL;TYPE=WORK,VOICE:+49 30 1234567',
	'EMAIL;TYPE=WORK:erika.mustermann@example.com',
	'ADR;TYPE=WORK:;;Musterstraße 12;Berlin;;10115;Germany',
	'URL:https://www.qrcodly.de/',
	'NOTE:Every setting in here must render the same forever.',
	'END:VCARD',
].join('\n');

/**
 * Fixed QR codes covering every dot and corner shape, solid, translucent and transparent colors,
 * linear gradients at several angles (and the null default), radial gradients, PNG, SVG, JPEG and
 * transparent WebP logos and a large code. Their reference images pin down how QR codes look; see qr-code-golden.test.ts.
 */
export const GOLDEN_CASES: TGoldenCase[] = [
	{ id: '01-defaults', data: URL_DATA, config: base({}) },
	{
		id: '02-dots-solid',
		data: URL_DATA,
		config: base({
			dotsOptions: { type: 'dots', style: hex('#1d4ed8') },
			cornersSquareOptions: { type: 'dot', style: hex('#f59e0b') },
			cornersDotOptions: { type: 'dot', style: hex('#f59e0b') },
		}),
	},
	{
		id: '03-classy-rgba',
		data: URL_DATA,
		config: base({
			margin: 16,
			dotsOptions: { type: 'classy', style: rgba('rgba(29, 78, 216, 0.6)') },
			cornersSquareOptions: { type: 'square', style: hex('#111827') },
			cornersDotOptions: { type: 'square', style: hex('#111827') },
			backgroundOptions: { style: rgba('rgba(255, 240, 200, 1)') },
		}),
	},
	{
		id: '04-transparent-background',
		data: URL_DATA,
		config: base({
			margin: 24,
			dotsOptions: { type: 'classy-rounded', style: hex('#065f46') },
			cornersSquareOptions: { type: 'extra-rounded', style: hex('#065f46') },
			cornersDotOptions: { type: 'dot', style: hex('#065f46') },
			backgroundOptions: { style: rgba('rgba(0, 0, 0, 0)') },
		}),
	},
	{
		id: '05-linear-45-and-270',
		data: URL_DATA,
		config: base({
			dotsOptions: {
				type: 'extra-rounded',
				style: gradient('linear', 45, ['#ff0080', '#7928ca']),
			},
			cornersSquareOptions: {
				type: 'extra-rounded',
				style: gradient('linear', 270, ['#7928ca', '#ff0080']),
			},
			cornersDotOptions: { type: 'dot', style: hex('#7928ca') },
		}),
	},
	{
		id: '06-linear-background-180',
		data: URL_DATA,
		config: base({
			dotsOptions: { type: 'square', style: hex('#000000') },
			cornersSquareOptions: {
				type: 'extra-rounded',
				style: gradient('linear', 135, ['#0ea5e9', '#1e3a8a']),
			},
			cornersDotOptions: { type: 'square', style: hex('#1e3a8a') },
			backgroundOptions: { style: gradient('linear', 180, ['#ffffff', '#9fe2bf']) },
		}),
	},
	{
		id: '07-radial',
		data: URL_DATA,
		config: base({
			dotsOptions: {
				type: 'rounded',
				style: gradient('radial', 0, ['#cc0000', '#721d03'], [0.63, 1]),
			},
			cornersSquareOptions: { type: 'dot', style: gradient('radial', 0, ['#cc0000', '#721d03']) },
			cornersDotOptions: { type: 'dot', style: hex('#721d03') },
		}),
	},
	{
		id: '08-logo-png',
		data: URL_DATA,
		logo: 'png',
		config: base({
			imageOptions: { hideBackgroundDots: true },
			dotsOptions: { type: 'rounded', style: hex('#111827') },
		}),
	},
	{
		id: '09-logo-svg-dots-behind',
		data: URL_DATA,
		logo: 'svg',
		config: base({
			imageOptions: { hideBackgroundDots: false },
			dotsOptions: { type: 'dots', style: hex('#374151') },
			cornersSquareOptions: { type: 'square', style: hex('#374151') },
		}),
	},
	{
		id: '10-vcard-large',
		data: VCARD_DATA,
		config: base({
			width: 1000,
			height: 1000,
			margin: 10,
			dotsOptions: {
				type: 'classy-rounded',
				style: gradient('linear', null, ['#0f766e', '#22d3ee']),
			},
			cornersSquareOptions: { type: 'extra-rounded', style: hex('#0f766e') },
			cornersDotOptions: { type: 'dot', style: gradient('linear', 0, ['#22d3ee', '#0f766e']) },
		}),
	},
	{
		id: '11-logo-jpeg',
		data: URL_DATA,
		logo: 'jpg',
		config: base({
			imageOptions: { hideBackgroundDots: true },
			dotsOptions: { type: 'square', style: hex('#0f172a') },
		}),
	},
	{
		// soft, half-transparent edges: a canvas would change their colors while decoding
		id: '12-logo-webp-transparent',
		data: URL_DATA,
		logo: 'webp',
		config: base({
			imageOptions: { hideBackgroundDots: false },
			dotsOptions: { type: 'dots', style: hex('#14532d') },
			backgroundOptions: { style: hex('#ecfdf5') },
		}),
	},
];
