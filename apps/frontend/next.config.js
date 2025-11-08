import { withSentryConfig } from '@sentry/nextjs';
import { withAxiom } from 'next-axiom';
import { env } from './src/env.js';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import('./src/env.js');

/** @type {import("next").NextConfig} */
const config = {
	eslint: {
		ignoreDuringBuilds: true,
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
			{
				source: '/ingest/static/:path*',
				destination: 'https://eu-assets.i.posthog.com/static/:path*',
			},
			{
				source: '/ingest/:path*',
				destination: 'https://eu.i.posthog.com/:path*',
			},
			{
				source: '/ingest/decide',
				destination: 'https://eu.i.posthog.com/decide',
			},
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
		domains: ['localhost', 's3.fr-par.scw.cloud'],
		formats: ['image/webp'],
	},
};

// Combine both Sentry and Axiom configurations
const sentryOptions = {
	org: 'fb-development',
	project: 'qrcodly',
	silent: !process.env.CI,
	widenClientFileUpload: true,
	tunnelRoute: '/monitoring',
	disableLogger: true,
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
export default withAxiom(withNextIntl(withSentryConfig(config, sentryOptions)));
