import base from 'qrcodly-eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
	...base(import.meta.dirname),
	{
		// UI (DOM) and plugin sandbox (Figma globals) need separate type environments.
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.json', './tsconfig.plugin.json'],
			},
		},
	},
];
