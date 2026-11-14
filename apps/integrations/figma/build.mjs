import { build, context } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

// Pin the API endpoint at build time. Production always points at the live
// API; local dev defaults to localhost:5001 unless QRCODLY_API_URL is set.
// Any other host must also be listed in manifest.json → networkAccess.
const apiBaseUrl =
	process.env.QRCODLY_API_URL ||
	(production ? 'https://api.qrcodly.de/api/v1' : 'http://localhost:5001/api/v1');

const pluginVersion = JSON.parse(await readFile('package.json', 'utf-8')).version;

const shared = {
	bundle: true,
	minify: production,
	sourcemap: production ? false : 'inline',
	logLevel: 'info',
};

/** @type {import('esbuild').BuildOptions} */
const pluginOptions = {
	...shared,
	entryPoints: ['src/plugin/code.ts'],
	outfile: 'dist/code.js',
	tsconfig: 'tsconfig.plugin.json',
	// The plugin sandbox is not a browser; keep the syntax conservative.
	target: 'es2017',
	format: 'iife',
};

// Figma loads the UI as a single HTML string, so JS and CSS are inlined.
const inlineHtml = {
	name: 'inline-html',
	setup(pluginBuild) {
		pluginBuild.onEnd(async (result) => {
			if (result.errors.length > 0 || !result.outputFiles) return;
			const js = result.outputFiles.find((file) => file.path.endsWith('.js'))?.text ?? '';
			const css = result.outputFiles.find((file) => file.path.endsWith('.css'))?.text ?? '';
			const html = [
				'<!doctype html>',
				'<html>',
				'<head><meta charset="UTF-8" />',
				`<style>${css}</style>`,
				'</head>',
				'<body>',
				'<div id="root"></div>',
				`<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`,
				'</body>',
				'</html>',
			].join('\n');
			await mkdir('dist', { recursive: true });
			await writeFile('dist/ui.html', html);
		});
	},
};

/** @type {import('esbuild').BuildOptions} */
const uiOptions = {
	...shared,
	entryPoints: ['src/ui/index.tsx'],
	outdir: 'dist/ui',
	tsconfig: 'tsconfig.json',
	target: 'es2020',
	format: 'iife',
	write: false,
	define: {
		__QRCODLY_API_URL__: JSON.stringify(apiBaseUrl),
		__QRCODLY_PLUGIN_VERSION__: JSON.stringify(pluginVersion),
		'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
	},
	plugins: [inlineHtml],
};

if (watch) {
	const contexts = await Promise.all([context(pluginOptions), context(uiOptions)]);
	await Promise.all(contexts.map((ctx) => ctx.watch()));
} else {
	await Promise.all([build(pluginOptions), build(uiOptions)]);
}
