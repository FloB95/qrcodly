import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

const shimDir = resolve(__dirname, 'src/shims');
const frontendSrc = resolve(__dirname, '../frontend/src');
const manifestPath = resolve(__dirname, 'manifest.json');
const packageJsonPath = resolve(__dirname, 'package.json');

// Without these the popup crashes on open and Chrome collapses it to nothing
const requiredEnv = ['VITE_CLERK_PUBLISHABLE_KEY', 'VITE_CLERK_SYNC_HOST'];

// Local backend + Clerk development instance
const devHostPermissions = ['http://localhost/*', 'https://*.clerk.accounts.dev/*'];

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
		'@clerk/nextjs': resolve(shimDir, 'clerk.ts'),
		'next-intl/server': resolve(shimDir, 'next-intl-server.ts'),
		'next-intl/routing': resolve(shimDir, 'next-intl-routing.ts'),
		'next-intl': resolve(shimDir, 'next-intl.ts'),
		'next/link': resolve(shimDir, 'next-link.tsx'),
		'next/navigation': resolve(shimDir, 'next-navigation.ts'),
		'next/image': resolve(shimDir, 'next-image.tsx'),
		'next/dynamic': resolve(shimDir, 'next-dynamic.tsx'),
		'@sentry/nextjs': resolve(shimDir, 'sentry.ts'),
		'posthog-js': resolve(shimDir, 'posthog.ts'),
		'@react-google-maps/api': resolve(shimDir, 'google-maps.tsx'),
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

function extensionManifest(mode: string): Plugin {
	return {
		name: 'extension-manifest',
		buildStart() {
			this.addWatchFile(manifestPath);
			this.addWatchFile(packageJsonPath);
		},
		generateBundle() {
			const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
			manifest.version = JSON.parse(readFileSync(packageJsonPath, 'utf-8')).version;
			if (mode === 'development') {
				manifest.host_permissions.push(...devHostPermissions);
			}
			this.emitFile({
				type: 'asset',
				fileName: 'manifest.json',
				source: JSON.stringify(manifest, null, '\t'),
			});
		},
	};
}

export default defineConfig(({ command, mode }) => {
	if (command === 'build') {
		const env = loadEnv(mode, __dirname, 'VITE_');
		const missing = requiredEnv.filter((key) => !env[key]);
		if (missing.length) {
			throw new Error(`Missing ${missing.join(', ')} for mode "${mode}" (see .env.${mode})`);
		}
	}

	return {
		base: '',
		plugins: [
			extensionAliasPlugin(),
			react(),
			tailwindcss(),
			stripCrossOrigin(),
			extensionManifest(mode),
		],
		build: {
			outDir: 'dist',
			emptyOutDir: true,
		},
	};
});
