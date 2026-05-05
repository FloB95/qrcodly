import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync, statSync } from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

const shimDir = resolve(__dirname, 'src/shims');
const frontendSrc = resolve(__dirname, '../frontend/src');

const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'];

function tryResolve(basePath: string): string | null {
	// Try with file extensions first
	for (const ext of fileExtensions) {
		const full = basePath + ext;
		if (existsSync(full)) return full;
	}
	// Try as directory with index file
	for (const ext of fileExtensions) {
		const full = resolve(basePath, 'index' + ext);
		if (existsSync(full)) return full;
	}
	// If exact path exists as a file (no extension needed, e.g. .json already included)
	if (existsSync(basePath)) {
		const stat = statSync(basePath);
		if (stat.isFile()) return basePath;
	}
	return null;
}

function extensionAliasPlugin(): Plugin {
	const exactAliases: Record<string, string> = {
		'@/env': resolve(shimDir, 'env.ts'),
		'@/i18n/routing': resolve(shimDir, 'i18n-routing.ts'),
		'@/i18n/navigation': resolve(shimDir, 'i18n-navigation.ts'),
		'@clerk/nextjs/server': resolve(shimDir, 'clerk-server.ts'),
		'@clerk/nextjs/experimental': resolve(shimDir, 'clerk-experimental.ts'),
		'@clerk/nextjs': resolve(shimDir, 'clerk.tsx'),
		'next-intl/server': resolve(shimDir, 'next-intl-server.ts'),
		'next-intl/routing': resolve(shimDir, 'next-intl-routing.ts'),
		'next-intl': resolve(shimDir, 'next-intl.ts'),
		'next/link': resolve(shimDir, 'next-link.tsx'),
		'next/navigation': resolve(shimDir, 'next-navigation.ts'),
		'next/image': resolve(shimDir, 'next-image.tsx'),
		'next/dynamic': resolve(shimDir, 'next-dynamic.tsx'),
		'@sentry/nextjs': resolve(shimDir, 'sentry.ts'),
		'posthog-js': resolve(shimDir, 'posthog.ts'),
		'fumadocs-ui/css/shadcn.css': resolve(shimDir, 'empty.css'),
		'fumadocs-ui/css/preset.css': resolve(shimDir, 'empty.css'),
		'fumadocs-openapi/css/preset.css': resolve(shimDir, 'empty.css'),
	};

	return {
		name: 'extension-frontend-aliases',
		enforce: 'pre',
		resolveId(source) {
			// Exact matches first
			if (exactAliases[source]) {
				return exactAliases[source];
			}

			// @shared/schemas prefix
			if (source === '@shared/schemas' || source.startsWith('@shared/schemas/')) {
				const rest = source.replace('@shared/schemas', '');
				const base = resolve(__dirname, '../../packages/shared/src' + rest);
				return tryResolve(base);
			}

			// @/ prefix → frontend src
			if (source.startsWith('@/')) {
				const rest = source.slice(2); // remove '@/'
				const base = resolve(frontendSrc, rest);
				return tryResolve(base);
			}

			// @ext/ prefix → extension src
			if (source.startsWith('@ext/')) {
				const rest = source.slice(5); // remove '@ext/'
				const base = resolve(__dirname, 'src', rest);
				return tryResolve(base);
			}

			return null;
		},
	};
}

// Strip crossorigin attributes from HTML — they cause issues in extension context
function stripCrossOrigin(): Plugin {
	return {
		name: 'strip-crossorigin',
		enforce: 'post',
		transformIndexHtml(html) {
			return html.replace(/ crossorigin/g, '');
		},
	};
}

// Replace dynamic-eval polyfill patterns ('Function("return this")()') with `globalThis` —
// MV3 forbids unsafe-eval in extension_pages CSP, so any string-eval at load time is blocked.
// These patterns come from older deps (e.g. via @solana/web3.js pulled in by @clerk/chrome-extension v3).
function stripEvalPolyfills(): Plugin {
	return {
		name: 'strip-eval-polyfills',
		enforce: 'post',
		generateBundle(_options, bundle) {
			for (const file of Object.values(bundle)) {
				if (file.type !== 'chunk') continue;
				let code = file.code;
				code = code.replace(
					/(?:new\s+)?Function\(\s*["']return this["']\s*\)\s*\(\s*\)/g,
					'globalThis',
				);
				// function-bind polyfill: matches Function("binder","return function (" + <expr> + "){ return binder.apply(this,arguments); }")
				// Replace with CSP-safe wrapper. Drops dynamic-arity preservation but keeps call semantics.
				code = code.replace(
					/(?:new\s+)?Function\(\s*["']binder["']\s*,\s*["']return function \(["']\s*\+\s*[^+]+\+\s*["']\)\{\s*return binder\.apply\(this,\s*arguments\);\s*\}["']\s*\)/g,
					'(function(binder){return function(){return binder.apply(this,arguments)}})',
				);
				file.code = code;
			}
		},
	};
}

export default defineConfig({
	base: '',
	plugins: [
		extensionAliasPlugin(),
		react(),
		tailwindcss(),
		stripCrossOrigin(),
		stripEvalPolyfills(),
	],
	build: {
		outDir: 'dist',
		emptyOutDir: true,
	},
});
