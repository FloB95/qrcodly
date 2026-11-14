import 'reflect-metadata';
import { container } from 'tsyringe';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import sharp from 'sharp';
import { build, type Plugin } from 'esbuild';
import { chromium, type Browser, type Page } from 'playwright';
import { QrCodeOptionsSchema, type TQrCodeOptions } from '@shared/schemas';
import { RenderQrCodeUseCase } from '../../useCase/render-qr-code.use-case';
import { QrCodeImageStrategy } from '../../domain/strategies/qr-code-image.strategy';
import { GOLDEN_CASES, GOLDEN_DIR, goldenLogo, type TGoldenCase } from './golden/cases';

/**
 * Pixel comparison of every way a QR code gets drawn against reference images in ./golden.
 * Any change to how QR codes look fails here, so it can't reach customers unnoticed.
 *
 * Intended changes: `UPDATE_QR_GOLDEN=1 pnpm run test -- qr-code-golden`, then review the new
 * images in the diff before committing them.
 */

const UPDATE = process.env.UPDATE_QR_GOLDEN === '1';
// resvg draws bit-identical images on macOS and Linux, arm64 and x86. Chromium's edge smoothing
// differs by up to ~10 levels between them; real changes are far above that.
const CHANNEL_TOLERANCE = { resvg: 0, chromium: 32 } as const;
type TRenderer = keyof typeof CHANNEL_TOLERANCE;
const DIFF_DIR = join(tmpdir(), 'qrcodly-golden-diff');

const APPS_DIR = resolve(__dirname, '../../../../../..');
const FRONTEND_LIB = join(APPS_DIR, 'frontend/src/lib');
const SHARED_SRC = join(APPS_DIR, '../packages/shared/src/index.ts');

const goldenFile = (renderer: TRenderer, golden: TGoldenCase, suffix = '') =>
	join(GOLDEN_DIR, renderer, `${golden.id}${suffix}.png`);

const withLogo = (golden: TGoldenCase, image: string | undefined): TQrCodeOptions => ({
	...QrCodeOptionsSchema.parse(golden.config),
	image,
});

type TPixels = { data: Buffer; width: number; height: number };

async function decode(png: Buffer): Promise<TPixels> {
	const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return { data, width: info.width, height: info.height };
}

/** Largest difference of the premultiplied RGBA channels, so invisible transparent pixels match. */
function pixelDifference(a: Buffer, b: Buffer, i: number): number {
	const alphaA = a[i + 3] / 255;
	const alphaB = b[i + 3] / 255;
	let max = Math.abs(a[i + 3] - b[i + 3]);
	for (let c = 0; c < 3; c++) {
		max = Math.max(max, Math.abs(a[i + c] * alphaA - b[i + c] * alphaB));
	}
	return max;
}

async function expectGolden(
	actualPng: Buffer,
	renderer: TRenderer,
	file: string,
	label: string,
	writeOnUpdate = false,
) {
	if (UPDATE && writeOnUpdate) {
		writeFileSync(file, actualPng);
		return;
	}

	const [actual, expected] = await Promise.all([decode(actualPng), decode(readFileSync(file))]);
	const name = `${label.replace(/\W+/g, '-')}`;

	if (actual.width !== expected.width || actual.height !== expected.height) {
		throw new Error(
			`${label}: size ${actual.width}x${actual.height} instead of ${expected.width}x${expected.height}`,
		);
	}

	const diff = Buffer.alloc(expected.data.length);
	let differing = 0;
	let largest = 0;
	for (let i = 0; i < expected.data.length; i += 4) {
		const difference = pixelDifference(actual.data, expected.data, i);
		largest = Math.max(largest, difference);
		const changed = difference > CHANNEL_TOLERANCE[renderer];
		if (changed) differing++;
		// changed pixels red, the rest a faint copy of the reference
		diff[i] = changed ? 255 : 255 - expected.data[i + 3] / 4;
		diff[i + 1] = changed ? 0 : 255 - expected.data[i + 3] / 4;
		diff[i + 2] = changed ? 0 : 255 - expected.data[i + 3] / 4;
		diff[i + 3] = 255;
	}

	if (differing > 0) {
		mkdirSync(DIFF_DIR, { recursive: true });
		const actualFile = join(DIFF_DIR, `${name}.actual.png`);
		const diffFile = join(DIFF_DIR, `${name}.diff.png`);
		writeFileSync(actualFile, actualPng);
		await sharp(diff, { raw: { width: expected.width, height: expected.height, channels: 4 } })
			.png()
			.toFile(diffFile);
		throw new Error(
			`${label}: ${differing} pixels differ from ${file} (largest difference ${largest}).\n` +
				`Rendered: ${actualFile}\nDifference: ${diffFile}\n` +
				'If the change is intended, update the references with UPDATE_QR_GOLDEN=1.',
		);
	}
}

/** The browser's own render module (apps/frontend/src/lib/qr-render.ts), bundled for Chromium. */
async function bundleBrowserRenderer(): Promise<string> {
	const stubs: Plugin = {
		name: 'golden-stubs',
		setup(bundler) {
			bundler.onResolve({ filter: /^@shared\/schemas$/ }, () => ({ path: SHARED_SRC }));
			bundler.onResolve({ filter: /^(@sentry\/nextjs|@\/lib\/utils)$/ }, (args) => ({
				path: args.path,
				namespace: 'stub',
			}));
			bundler.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
				contents:
					args.path === '@sentry/nextjs'
						? 'export const captureException = () => {};'
						: "export const fetchImageAsBase64 = () => { throw new Error('golden logos are data URLs'); };",
				loader: 'js',
			}));
		},
	};

	const result = await build({
		stdin: {
			contents: `
				import { renderQrCodeSvg, renderQrCodeBlob } from './qr-render';
				import { convertQrCodeOptionsToLibraryOptions } from '@shared/schemas';

				const options = (config, data) => ({ ...convertQrCodeOptionsToLibraryOptions(config), data });

				window.qrGolden = {
					svg: (config, data) => renderQrCodeSvg(options(config, data)),
					png: async (config, data) => {
						const blob = await renderQrCodeBlob(options(config, data), 'png');
						const bytes = new Uint8Array(await blob.arrayBuffer());
						let binary = '';
						for (const byte of bytes) binary += String.fromCharCode(byte);
						return btoa(binary);
					},
				};
			`,
			resolveDir: FRONTEND_LIB,
			loader: 'ts',
		},
		bundle: true,
		write: false,
		format: 'iife',
		platform: 'browser',
		target: 'es2020',
		define: { 'process.env.NODE_ENV': '"production"' },
		plugins: [stubs],
		logLevel: 'silent',
	});
	return result.outputFiles[0].text;
}

describe('QR code golden images', () => {
	const renderUseCase = container.resolve(RenderQrCodeUseCase);
	const previewStrategy = new QrCodeImageStrategy();
	let browser: Browser;
	let page: Page;

	const rasterize = (svg: string, golden: TGoldenCase): Buffer =>
		renderUseCase['rasterize'](svg, golden.config.width);

	beforeAll(async () => {
		const script = await bundleBrowserRenderer();
		try {
			browser = await chromium.launch();
		} catch (error) {
			throw new Error(
				`Chromium is missing: run "pnpm --filter @apps/backend exec playwright install chromium".\n${String(error)}`,
			);
		}
		page = await browser.newPage();
		await page.setContent('<!doctype html><html><body></body></html>');
		await page.addScriptTag({ content: script });
	}, 60_000);

	afterAll(async () => {
		jest.restoreAllMocks();
		await browser?.close();
	});

	describe.each(GOLDEN_CASES)('$id', (golden) => {
		const logo = golden.logo ? goldenLogo(golden.logo) : undefined;

		it('render endpoint (API, Figma, InDesign)', async () => {
			const png = await renderUseCase['renderBuffer'](
				{ config: withLogo(golden, logo?.dataUrl), data: golden.data },
				'png',
				golden.config.width,
			);
			await expectGolden(
				png,
				'resvg',
				goldenFile('resvg', golden),
				`${golden.id} render endpoint`,
				true,
			);
		});

		it('preview image (dashboard)', async () => {
			const storage = previewStrategy['objectStorage'];
			const logoPath = `golden/logo.${golden.logo}`;
			jest
				.spyOn(storage, 'get')
				.mockImplementation(async (key) => (key === logoPath && logo ? logo.buffer : null));
			let svg = '';
			jest.spyOn(storage, 'upload').mockImplementation(async (_key, body) => {
				// generatePreview uploads the SVG as a Buffer
				svg = (body as Buffer).toString('utf8');
			});

			const path = await previewStrategy.generatePreview({
				id: golden.id,
				createdBy: 'golden',
				config: withLogo(golden, logo ? logoPath : undefined),
				qrCodeData: golden.data,
			});

			expect(path).toBeDefined();
			await expectGolden(
				rasterize(svg, golden),
				'resvg',
				goldenFile('resvg', golden),
				`${golden.id} preview`,
			);
		});

		it('browser preview (SVG)', async () => {
			const svg = await page.evaluate(
				([config, data]) =>
					(
						window as unknown as { qrGolden: { svg: (c: unknown, d: string) => Promise<string> } }
					).qrGolden.svg(config, data),
				[withLogo(golden, logo?.dataUrl), golden.data] as const,
			);
			await expectGolden(
				rasterize(svg, golden),
				'resvg',
				goldenFile('resvg', golden, golden.ownBrowserPreview ? '.browser' : ''),
				`${golden.id} browser preview`,
				golden.ownBrowserPreview,
			);
		});

		it('browser download (PNG drawn by Chromium)', async () => {
			const base64 = await page.evaluate(
				([config, data]) =>
					(
						window as unknown as { qrGolden: { png: (c: unknown, d: string) => Promise<string> } }
					).qrGolden.png(config, data),
				[withLogo(golden, logo?.dataUrl), golden.data] as const,
			);
			await expectGolden(
				Buffer.from(base64, 'base64'),
				'chromium',
				goldenFile('chromium', golden),
				`${golden.id} browser download`,
				true,
			);
		});
	});
});
