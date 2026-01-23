import { withSentryConfig } from '@sentry/nextjs';
import { withAxiom } from 'next-axiom';
import { env } from './src/env.js';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import { createMDX } from 'fumadocs-mdx/next';
import bundleAnalyzer from '@next/bundle-analyzer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
});

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import('./src/env.js');

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	productionBrowserSourceMaps: true,
	experimental: {
		optimizePackageImports: [
			'@heroicons/react',
			'lucide-react',
			'framer-motion',
			'@radix-ui/react-icons',
			'recharts',
		],
	},
	webpack: (config) => {
		config.module.rules.push({
			test: /\.svg$/,
			use: [
				{
					loader: '@svgr/webpack',
					options: {
						svgo: false,
						svgoConfig: {
							plugins: [
								{
									name: 'removeViewBox',
									active: false,
								},
							],
						},
					},
				},
			],
		});

		config.externals = [
			...config.externals,
			{
				'thread-stream': 'commonjs thread-stream',
			},
		];

		config.resolve.fallback = { fs: false };
		return config;
	},
	async rewrites() {
		return [
			// {
			// 	source: '/umami.js',
			// 	destination: `${env.UMAMI_API_HOST}/script.js`,
			// },
			{
				source: '/api/umami',
				destination: `${env.UMAMI_API_HOST}/api/send`,
			},
		];
	},
	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
	images: {
		remotePatterns: [
			{
				protocol: 'http',
				hostname: 'localhost',
				port: '3000',
			},
			{
				protocol: 'https',
				hostname: 's3.fr-par.scw.cloud',
				pathname: '/**',
			},
		],
		formats: ['image/avif', 'image/webp'],
	},
};

// Combine both Sentry and Axiom configurations
const sentryOptions = {
	org: 'fb-development',
	project: 'qrcodly',
	silent: !process.env.CI,
	widenClientFileUpload: true,
	tunnelRoute: '/monitoring',
	dryRun: true,
	telemetry: false,
	sourcemaps: {
		disable: true,
	},
	release: {
		create: false,
	},
};

const withNextIntl = createNextIntlPlugin();
const withMDX = createMDX();

export default withBundleAnalyzer(
	withAxiom(withNextIntl(withMDX(withSentryConfig(config, sentryOptions)))),
);
