import 'reflect-metadata';
import { container } from 'tsyringe';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import sharp from 'sharp';
import { build, type Plugin } from 'esbuild';
import { chromium, type Browser, type Page } from 'playwright';
import { QrCodeOptionsSchema, rasterizeQrCodeSvg, type TQrCodeOptions } from '@shared/schemas';
import { RenderQrCodeUseCase } from '../../useCase/render-qr-code.use-case';
import { QrCodeImageStrategy } from '../../domain/strategies/qr-code-image.strategy';
import { qrCodeRenderer } from '../styled-qr-code';
import { GOLDEN_CASES, GOLDEN_DIR, goldenLogo, type TGoldenCase } from './golden/cases';

/**
 * Pixel comparison of every way a QR code gets drawn against one reference image per code in
 * ./golden/resvg. Server and browser share one pipeline and one resvg build, so every path must
 * match exactly; any difference fails here instead of reaching customers.
 *
 * Intended changes: `UPDATE_QR_GOLDEN=1 pnpm run test -- qr-code-golden`, then review the new
 * images in the diff before committing them.
 */

const UPDATE = process.env.UPDATE_QR_GOLDEN === '1';
const DIFF_DIR = join(tmpdir(), 'qrcodly-golden-diff');

const FRONTEND_DIR = resolve(__dirname, '../../../../../../frontend');
const FRONTEND_LIB = join(FRONTEND_DIR, 'src/lib');
const SHARED_SRC = resolve(FRONTEND_DIR, '../../packages/shared/src/index.ts');
// the browser page lives here, so the renderer fetches its WASM files from this origin
const PAGE_ORIGIN = 'https://golden.test';

const goldenFile = (golden: TGoldenCase) => join(GOLDEN_DIR, 'resvg', `${golden.id}.png`);

const withLogo = (golden: TGoldenCase, image: string | undefined): TQrCodeOptions => ({
	...QrCodeOptionsSchema.parse(golden.config),
	image,
});

type TPixels = { data: Buffer; width: number; height: number };

async function decode(png: Buffer): Promise<TPixels> {
	const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return { data, width: info.width, height: info.height };
}

async function expectGolden(actualPng: Buffer, golden: TGoldenCase, label: string, write = false) {
	const file = goldenFile(golden);
	if (UPDATE && write) {
		writeFileSync(file, actualPng);
		return;
	}

	const [actual, expected] = await Promise.all([decode(actualPng), decode(readFileSync(file))]);

	if (actual.width !== expected.width || actual.height !== expected.height) {
		throw new Error(
			`${label}: size ${actual.width}x${actual.height} instead of ${expected.width}x${expected.height}`,
		);
	}

	const diff = Buffer.alloc(expected.data.length);
	let differing = 0;
	let largest = 0;
	for (let i = 0; i < expected.data.length; i += 4) {
		let difference = 0;
		for (let c = 0; c < 4; c++) {
			difference = Math.max(difference, Math.abs(actual.data[i + c] - expected.data[i + c]));
		}
		largest = Math.max(largest, difference);
		const changed = difference > 0;
		if (changed) differing++;
		// changed pixels red, the rest a faint copy of the reference
		diff[i] = changed ? 255 : 255 - expected.data[i + 3] / 4;
		diff[i + 1] = changed ? 0 : 255 - expected.data[i + 3] / 4;
		diff[i + 2] = changed ? 0 : 255 - expected.data[i + 3] / 4;
		diff[i + 3] = 255;
	}

	if (differing > 0) {
		const name = label.replace(/\W+/g, '-');
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
	const aliases: Plugin = {
		name: 'golden-aliases',
		setup(bundler) {
			bundler.onResolve({ filter: /^@shared\/schemas$/ }, () => ({ path: SHARED_SRC }));
			bundler.onResolve({ filter: /^@\/lib\/qr-render-wasm$/ }, () => ({
				path: join(FRONTEND_LIB, 'qr-render-wasm.ts'),
			}));
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
				import { renderQrCodeBlob, renderQrCodePng } from './qr-render';
				import { convertQrCodeOptionsToLibraryOptions } from '@shared/schemas';

				const options = (config, data) => ({ ...convertQrCodeOptionsToLibraryOptions(config), data });
				const base64 = async (blob) => {
					let binary = '';
					for (const byte of new Uint8Array(await blob.arrayBuffer())) binary += String.fromCharCode(byte);
					return btoa(binary);
				};

				window.qrGolden = {
					preview: async (config, data) => base64(await renderQrCodePng(options(config, data))),
					download: async (config, data, extension) =>
						base64(await renderQrCodeBlob(options(config, data), extension)),
				};
			`,
			resolveDir: FRONTEND_LIB,
			loader: 'ts',
		},
		bundle: true,
		write: false,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
		define: {
			'process.env.NODE_ENV': '"production"',
			// as the bundlers do: WASM files are addressed relative to the page
			'import.meta.url': '__goldenPageUrl',
		},
		banner: { js: 'var __goldenPageUrl = location.href;' },
		plugins: [aliases],
		logLevel: 'silent',
	});
	return result.outputFiles[0].text;
}

type TBrowserApi = {
	preview: (config: unknown, data: string) => Promise<string>;
	download: (config: unknown, data: string, extension: string) => Promise<string>;
};

describe('QR code golden images', () => {
	const renderUseCase = container.resolve(RenderQrCodeUseCase);
	const previewStrategy = new QrCodeImageStrategy();
	let browser: Browser;
	let page: Page;

	const renderEndpoint = (golden: TGoldenCase, format: 'png' | 'svg', logo?: string) =>
		renderUseCase['renderBuffer'](
			{ config: withLogo(golden, logo), data: golden.data },
			format,
			golden.config.width,
		);

	const inBrowser = (golden: TGoldenCase, logo: string | undefined, extension?: 'png' | 'svg') =>
		page
			.evaluate(
				([config, data, ext]) => {
					const api = (window as unknown as { qrGolden: TBrowserApi }).qrGolden;
					return ext ? api.download(config, data, ext) : api.preview(config, data);
				},
				[withLogo(golden, logo), golden.data, extension] as const,
			)
			.then((base64) => Buffer.from(base64, 'base64'));

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
		await page.route(`${PAGE_ORIGIN}/**`, async (route) => {
			const path = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
			if (!path) {
				return route.fulfill({
					contentType: 'text/html',
					body: `<!doctype html><html><body><script>${script}</script></body></html>`,
				});
			}
			if (!path.endsWith('.wasm')) return route.fulfill({ status: 404 });
			// served from the frontend's node_modules, like a bundler would copy them
			const file = require.resolve(path, { paths: [FRONTEND_DIR] });
			return route.fulfill({ contentType: 'application/wasm', body: readFileSync(file) });
		});
		await page.goto(`${PAGE_ORIGIN}/`);
	}, 60_000);

	afterAll(async () => {
		jest.restoreAllMocks();
		await browser?.close();
	});

	describe.each(GOLDEN_CASES)('$id', (golden) => {
		const logo = golden.logo ? goldenLogo(golden.logo) : undefined;

		it('render endpoint (API, Figma, InDesign)', async () => {
			const png = await renderEndpoint(golden, 'png', logo?.dataUrl);
			await expectGolden(png, golden, `${golden.id} render endpoint`, true);
		});

		it('preview image (dashboard)', async () => {
			const storage = previewStrategy['objectStorage'];
			const logoPath = `golden/logo.${golden.logo}`;
			jest
				.spyOn(storage, 'get')
				.mockImplementation(async (key) => (key === logoPath && logo ? logo.buffer : null));
			let uploaded: { body: Buffer; contentType?: string } | undefined;
			jest.spyOn(storage, 'upload').mockImplementation(async (_key, body, contentType) => {
				uploaded = { body: body as Buffer, contentType };
			});

			const path = await previewStrategy.generatePreview({
				id: golden.id,
				createdBy: 'golden',
				config: withLogo(golden, logo ? logoPath : undefined),
				qrCodeData: golden.data,
			});

			expect(path).toMatch(/\.png$/);
			expect(uploaded?.contentType).toBe('image/png');
			await expectGolden(uploaded!.body, golden, `${golden.id} preview`);
		});

		it('browser preview (PNG, resvg-wasm)', async () => {
			await expectGolden(
				await inBrowser(golden, logo?.dataUrl),
				golden,
				`${golden.id} browser preview`,
			);
		});

		it('browser download (PNG)', async () => {
			await expectGolden(
				await inBrowser(golden, logo?.dataUrl, 'png'),
				golden,
				`${golden.id} browser download`,
			);
		});

		it('SVG download is the same file in the browser and from the API', async () => {
			const [browserSvg, apiSvg] = await Promise.all([
				inBrowser(golden, logo?.dataUrl, 'svg'),
				renderEndpoint(golden, 'svg', logo?.dataUrl),
			]);

			expect(browserSvg.toString('utf8')).toBe(apiSvg.toString('utf8'));
			await expectGolden(
				Buffer.from(
					rasterizeQrCodeSvg(browserSvg.toString('utf8'), qrCodeRenderer, golden.config.width),
				),
				golden,
				`${golden.id} SVG download`,
			);
		});
	});
});
