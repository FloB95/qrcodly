import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
	input: ['http://localhost:5001/openapi.json'],
});
