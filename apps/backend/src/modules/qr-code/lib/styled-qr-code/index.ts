import { readFile } from 'fs/promises';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { type Options } from 'qr-code-styling';
import { JSDOM } from 'jsdom';
import { Resvg } from '@resvg/resvg-js';
import {
	buildQrCodeSvg,
	rasterizeQrCodeSvg,
	type TQrCodeLogo,
	type TQrCodeRenderer,
	type TWebpCodec,
} from '@shared/schemas';

// Jest runs this file as CommonJS, tsx and the build as ES module
const moduleFile = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);

async function loadWasm(file: string): Promise<WebAssembly.Module> {
	return WebAssembly.compile(await readFile(createRequire(moduleFile).resolve(file)));
}

// the same WASM files the browser loads, so WebP logos decode to the same pixels there and here
async function loadWebpCodec(): Promise<TWebpCodec> {
	const [webp, png] = await Promise.all([
		import('@jsquash/webp/decode.js'),
		import('@jsquash/png/encode.js'),
	]);
	await Promise.all([
		loadWasm('@jsquash/webp/codec/dec/webp_dec.wasm').then((module) => webp.init(module)),
		loadWasm('@jsquash/png/codec/pkg/squoosh_png_bg.wasm').then((module) => png.init(module)),
	]);
	const decode = defaultExport(webp);
	const encode = defaultExport(png);
	return {
		decode: (data) => decode(data),
		encodePng: (image) => encode(image as ImageData),
	};
}

// Jest loads these ES modules through CommonJS interop, which wraps the namespace once more
const defaultExport = <T>(module: { default: T }): T =>
	(module.default as { default?: T }).default ?? module.default;

let webpCodec: Promise<TWebpCodec> | undefined;
const { DOMParser, XMLSerializer } = new JSDOM().window;

/** The server's half of the shared render pipeline (the browser's is apps/frontend/src/lib). */
export const qrCodeRenderer: TQrCodeRenderer = {
	Resvg,
	DOMParser,
	XMLSerializer,
	loadWebpCodec: () => {
		webpCodec ??= loadWebpCodec().catch((error: unknown) => {
			webpCodec = undefined;
			throw error;
		});
		return webpCodec;
	},
};

/** JSDOM stands in for the browser DOM. */
export function renderQrCodeSvg(options: Options, logo: TQrCodeLogo | undefined): Promise<string> {
	return buildQrCodeSvg(options, logo, JSDOM);
}

/** PNG at the code's own width, pixel for pixel what the browser shows. */
export async function renderQrCodePng(
	options: Options,
	logo: TQrCodeLogo | undefined,
): Promise<Buffer> {
	const svg = await renderQrCodeSvg(options, logo);
	return Buffer.from(rasterizeQrCodeSvg(svg, qrCodeRenderer, options.width));
}
