import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	plugins: [react(), tailwindcss()],
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		watch: {},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@frontend': path.resolve(__dirname, '../frontend/src'),
			'@shared': path.resolve(__dirname, '../../packages/shared/src'),
		},
	},
});
