import { env } from '@/env';
import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
	input: [`${env.NEXT_PUBLIC_API_URL}/openapi.json`],
});
