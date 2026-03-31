import { z } from 'zod';

const schema = z.object({
	QRCODLY_API_BASE_URL: z.string().url().default('https://api.qrcodly.de'),
	PORT: z.coerce.number().int().min(1).max(65535).default(3002),
	HOST: z.string().default('0.0.0.0'),
	NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
	console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
	throw new Error('Invalid environment variables');
}

export const env = parsed.data;
