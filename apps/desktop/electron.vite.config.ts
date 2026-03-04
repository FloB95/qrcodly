import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';
import { existsSync, statSync } from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

const shimDir = resolve(__dirname, 'src/renderer/shims');
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

// Custom resolve plugin because electron-vite may merge/override standard aliases
function frontendAliasPlugin(): Plugin {
	const exactAliases: Record<string, string> = {
		'@/env': resolve(shimDir, 'env.ts'),
		'@/i18n/routing': resolve(shimDir, 'i18n-routing.ts'),
		'@/i18n/navigation': resolve(shimDir, 'i18n-navigation.ts'),
		'@clerk/nextjs/server': resolve(shimDir, 'clerk-server.ts'),
		'@clerk/nextjs/experimental': resolve(shimDir, 'clerk-experimental.ts'),
		'@clerk/nextjs': resolve(shimDir, 'clerk.ts'),
		'next-intl/server': resolve(shimDir, 'next-intl-server.ts'),
		'next-intl/routing': resolve(shimDir, 'next-intl-routing.ts'),
		'next-intl': resolve(shimDir, 'next-intl.ts'),
		'next/link': resolve(shimDir, 'next-link.tsx'),
		'next/navigation': resolve(shimDir, 'next-navigation.ts'),
		'next/image': resolve(shimDir, 'next-image.tsx'),
		'next/dynamic': resolve(shimDir, 'next-dynamic.tsx'),
		'@sentry/nextjs': resolve(shimDir, 'sentry.ts'),
		'fumadocs-ui/css/shadcn.css': resolve(shimDir, 'empty.css'),
		'fumadocs-ui/css/preset.css': resolve(shimDir, 'empty.css'),
		'fumadocs-openapi/css/preset.css': resolve(shimDir, 'empty.css'),
	};

	return {
		name: 'desktop-frontend-aliases',
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

			return null;
		},
	};
}

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin({ exclude: ['electron-log', 'electron-updater'] })],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
			},
		},
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				output: {
					format: 'cjs',
					entryFileNames: '[name].js',
				},
			},
		},
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
			},
		},
	},
	renderer: {
		root: './src/renderer',
		build: {
			rollupOptions: {
				input: resolve(__dirname, 'src/renderer/index.html'),
			},
		},
		plugins: [frontendAliasPlugin(), react(), tailwindcss()],
		resolve: {
			alias: {},
		},
	},
});
