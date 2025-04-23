import { withSentryConfig } from "@sentry/nextjs";
import { withAxiom } from "next-axiom";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

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
					loader: "@svgr/webpack",
					options: {
						svgo: true,
						svgoConfig: {
							plugins: [
								{
									name: "removeViewBox",
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
				"thread-stream": "commonjs thread-stream",
			},
		];

		config.resolve.fallback = { fs: false };
		return config;
	},
	async rewrites() {
		return [
			{
				source: "/ingest/static/:path*",
				destination: "https://eu-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://eu.i.posthog.com/:path*",
			},
			{
				source: "/ingest/decide",
				destination: "https://eu.i.posthog.com/decide",
			},
			{
				source: "/umami.js",
				destination: "https://umami.fb-development.de/script.js",
			},
			{
				source: "/api/umami",
				destination: "https://umami.fb-development.de/api/send",
			},
		];
	},
	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
	images: {
		domains: ["localhost", "s3.fr-par.scw.cloud"],
		formats: ["image/webp"],
	},
};

// Combine both Sentry and Axiom configurations
const sentryOptions = {
	org: "fb-development",
	project: "qrcodly",
	silent: !process.env.CI,
	widenClientFileUpload: true,
	tunnelRoute: "/monitoring",
	disableLogger: true,
	automaticVercelMonitors: true,
};

export default withAxiom(withSentryConfig(config, sentryOptions));
