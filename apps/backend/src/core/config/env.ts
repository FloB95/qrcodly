// import env
import 'dotenv/config';
import { z } from 'zod';

/**
 * Specify your server-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars.
 */
const server = z.object({
	BASE_URL: z.string().url().default('http://localhost:5001'),
	FRONTEND_URL: z.string().url().default('https://www.qrcodly.de'),
	DB_HOST: z.string(),
	DB_USER: z.string(),
	DB_PASSWORD: z.string(),
	DB_NAME: z.string(),
	TEST_DB_NAME: z.string().default('qrcodly_test'),
	DB_PORT: z.string(),
	DB_MIGRATING: z
		.union([z.boolean(), z.string().transform((val) => val === 'true')])
		.default(false),
	DB_SEEDING: z.union([z.boolean(), z.string().transform((val) => val === 'true')]).default(false),
	NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
	API_PORT: z.string().default('5001'),
	API_HOST: z.string().default('127.0.0.1'),
	LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
	REDIS_URL: z.string().url(),
	JWT_SECRET: z.string().min(32),
	COOKIE_SECRET: z.string().min(32),
	SMTP_HOST: z.string(),
	SMTP_PORT: z.string(),
	SMTP_USER: z.string(),
	SMTP_PASS: z.string(),
	S3_ENDPOINT: z.string(),
	S3_REGION: z.string(),
	S3_UPLOAD_KEY: z.string(),
	S3_UPLOAD_SECRET: z.string(),
	S3_BUCKET_NAME: z.string(),
	SENTRY_DSN: z.string().url(),
	AXIOM_DATASET: z.string().optional(),
	AXIOM_TOKEN: z.string().optional(),
	CLERK_PUBLISHABLE_KEY: z.string(),
	CLERK_SECRET_KEY: z.string(),
	POSTHOG_API_KEY: z.string(),
	POSTHOG_PROJECT_ID: z.string(),
	POSTHOG_HOST: z.string(),
});

// Don't touch the part below
// --------------------------

const merged = server;
type MergedOutput = z.infer<typeof merged>;
let env: MergedOutput = process.env as unknown as MergedOutput;

const skip =
	!!process.env.SKIP_ENV_VALIDATION &&
	process.env.SKIP_ENV_VALIDATION !== 'false' &&
	process.env.SKIP_ENV_VALIDATION !== '0';
if (!skip) {
	const parsed = merged.safeParse(process.env);

	if (parsed.success === false) {
		console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
		throw new Error('Invalid environment variables');
	}

	env = new Proxy(parsed.data, {
		get(target, prop) {
			if (typeof prop !== 'string') return undefined;
			return target[prop as keyof typeof target];
		},
	});
}

export { env };
