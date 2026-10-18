import { env } from '@/env';
import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
	// OPENAPI_URL: read the spec from another environment at build time (e.g. staging from prod)
	input: [process.env.OPENAPI_URL ?? `${env.NEXT_PUBLIC_API_URL}/openapi.json`],
});
