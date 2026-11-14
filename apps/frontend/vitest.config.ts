import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@shared/schemas': resolve(import.meta.dirname, '../../packages/shared/src'),
			'@': resolve(import.meta.dirname, 'src'),
		},
	},
	test: {
		include: ['src/**/*.test.ts'],
	},
});
