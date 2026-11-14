import 'reflect-metadata';
import { container } from 'tsyringe';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import {
	convertQrCodeOptionsToLibraryOptions,
	measureImageDataUrl,
	parseDataUrl,
	QrCodeDefaults,
} from '@shared/schemas';
import { QrCodeLogoService } from '@/core/services/qr-code-logo.service';
import { renderQrCodeSvg } from '../styled-qr-code';

const logoService = container.resolve(QrCodeLogoService);
const GREEN = '#00ff00';

const toDataUrl = (mimeType: string, content: Buffer | string) =>
	`data:${mimeType};base64,${Buffer.from(content).toString('base64')}`;

const solidImage = (format: 'png' | 'jpeg' | 'webp', width: number, height: number) =>
	sharp({ create: { width, height, channels: 3, background: GREEN } })
		.toFormat(format)
		.toBuffer();

async function renderWithLogo(logoDataUrl: string): Promise<string> {
	const { image: _image, ...options } = convertQrCodeOptionsToLibraryOptions(QrCodeDefaults);
	return renderQrCodeSvg(
		{ ...options, data: 'https://www.qrcodly.de/' },
		await logoService.toLogo(logoDataUrl),
	);
}

const isGreen = (r: number, g: number, b: number, a: number) =>
	r < 80 && g > 200 && b < 80 && a > 200;

function countGreen(pixels: Uint8Array | Buffer): number {
	let count = 0;
	for (let i = 0; i < pixels.length; i += 4) {
		if (isGreen(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])) count++;
	}
	return count;
}

const countGreenPixels = (svg: string) => countGreen(new Resvg(svg).render().pixels);

const countGreenPixelsInPng = async (dataUrl: string) =>
	countGreen(
		await sharp(Buffer.from(dataUrl.split(',')[1], 'base64'))
			.ensureAlpha()
			.raw()
			.toBuffer(),
	);

describe('QR code rendering', () => {
	it('draws SVG logos as PNG', async () => {
		const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect width="100" height="40" fill="${GREEN}"/></svg>`;
		const normalized = await logoService.normalize(toDataUrl('image/svg+xml', logo));

		expect(normalized.startsWith('data:image/png;')).toBe(true);
		expect(measureImageDataUrl(normalized)).toEqual({ width: 2048, height: 819 });
		expect(countGreenPixels(await renderWithLogo(normalized))).toBeGreaterThan(100);
	});

	it('refuses SVG logos with text instead of drawing them without it', async () => {
		const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><text x="0" y="30">Störung</text></svg>`;

		await expect(logoService.normalize(toDataUrl('image/svg+xml', logo))).rejects.toThrow(
			'SVG logos with text',
		);
	});

	it('places a wide logo by its real proportions', async () => {
		const svg = await renderWithLogo(toDataUrl('image/png', await solidImage('png', 300, 100)));
		const [, width, height] = /<image[^>]*width="([\d.]+)px"[^>]*height="([\d.]+)px"/.exec(svg)!;

		expect(Number(width) / Number(height)).toBeGreaterThan(2);
	});

	it('draws WebP logos', async () => {
		const svg = await renderWithLogo(toDataUrl('image/webp', await solidImage('webp', 60, 60)));

		expect(countGreenPixels(svg)).toBeGreaterThan(100);
	});

	it('leaves PNG logos untouched', async () => {
		const png = toDataUrl('image/png', await solidImage('png', 20, 20));

		expect(await logoService.normalize(png)).toBe(png);
	});

	it('does not embed files from the server disk', async () => {
		const file = join(mkdtempSync(join(tmpdir(), 'logo-')), 'secret.png');
		writeFileSync(file, await solidImage('png', 10, 10));
		const variants = [
			`<image href="${file}" width="10" height="10"/>`,
			`<image xmlns:a="http://www.w3.org/1999/xlink" a:href="${file}" width="10" height="10"/>`,
			`<image href="file://${file}" width="10" height="10"/>`,
			`<!DOCTYPE svg [<!ENTITY p "${file}">]>`,
		];

		for (const variant of variants) {
			const isDoctype = variant.startsWith('<!DOCTYPE');
			const body = isDoctype ? '<image href="&p;" width="10" height="10"/>' : variant;
			const logo = `${isDoctype ? variant : ''}<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#fff"/>${body}</svg>`;
			const normalized = await logoService.normalize(toDataUrl('image/svg+xml', logo));
			expect(await countGreenPixelsInPng(normalized)).toBe(0);
		}
	});

	it('accepts Illustrator files with a DOCTYPE', async () => {
		const logo = `<!DOCTYPE svg [<!ENTITY ns_svg "http://www.w3.org/2000/svg">]><svg xmlns="&ns_svg;" width="10" height="10"><rect width="10" height="10" fill="${GREEN}"/></svg>`;
		const normalized = await logoService.normalize(toDataUrl('image/svg+xml', logo));

		expect(await countGreenPixelsInPng(normalized)).toBeGreaterThan(100);
	});

	it('measures logo sizes from the file bytes', async () => {
		for (const format of ['png', 'jpeg', 'webp'] as const) {
			const dataUrl = toDataUrl(`image/${format}`, await solidImage(format, 123, 45));
			expect(measureImageDataUrl(dataUrl)).toEqual({ width: 123, height: 45 });
		}
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="100"></svg>';
		expect(measureImageDataUrl(toDataUrl('image/svg+xml', svg))).toEqual({
			width: 100,
			height: 25,
		});
	});

	it('parses hostile data URLs and SVGs in linear time', async () => {
		// these took minutes with the old regexes (quadratic backtracking)
		const hostileUrl = `data:${'+'.repeat(1_000_000)}`;
		const hostileSvg = toDataUrl('image/svg+xml', '<svg '.repeat(200_000));
		const started = Date.now();

		expect(measureImageDataUrl(hostileUrl)).toBeUndefined();
		expect(measureImageDataUrl(hostileSvg)).toBeUndefined();
		await expect(logoService.normalize(hostileUrl)).rejects.toThrow('Invalid image format');
		expect(Date.now() - started).toBeLessThan(1000);
	});

	it('reads data URLs like before', () => {
		expect(parseDataUrl('data:image/png;base64,AAA')).toEqual({
			mimeType: 'image/png',
			base64: true,
			payload: 'AAA',
		});
		expect(parseDataUrl('data:image/svg+xml;charset=utf-8,%3Csvg%3E')).toEqual({
			mimeType: 'image/svg+xml',
			base64: false,
			payload: '%3Csvg%3E',
		});
		expect(parseDataUrl('data:;base64,AAA')).toBeUndefined();
		expect(parseDataUrl('data:image/png')).toBeUndefined();
		expect(parseDataUrl('https://example.com/logo.png')).toBeUndefined();
	});

	it.each([
		[0, 0],
		[45, 45],
		[90, 90],
		[135, 135],
		[180, 180],
		[270, 270],
		[315, 315],
		[null, 90],
	])(
		'draws a linear gradient stored as %sdeg in the CSS direction %sdeg',
		async (rotation, css) => {
			const { image: _image, ...options } = convertQrCodeOptionsToLibraryOptions({
				...QrCodeDefaults,
				backgroundOptions: {
					style: {
						type: 'gradient',
						gradientType: 'linear',
						rotation,
						colorStops: [
							{ offset: 0, color: '#000000' },
							{ offset: 1, color: '#ffffff' },
						],
					},
				},
			});
			const svg = await renderQrCodeSvg({ ...options, data: 'https://www.qrcodly.de/' }, undefined);

			const tag = /<linearGradient[^>]*id="background-color[^"]*"[^>]*>/.exec(svg)?.[0] ?? '';
			const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((name) =>
				Number(new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1]),
			);
			// CSS angles run clockwise from "to top"; SVG y points down
			const drawn = (Math.atan2(x2 - x1, y1 - y2) * 180) / Math.PI;
			expect((drawn + 360) % 360).toBeCloseTo(css, 0);
		},
	);
});
