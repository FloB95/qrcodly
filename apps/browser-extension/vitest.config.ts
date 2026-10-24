/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig((configEnv) =>
	mergeConfig(viteConfig(configEnv), {
		test: {
			environment: 'jsdom',
			globals: true,
			include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		},
	}),
);
