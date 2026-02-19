import nodeConfig from 'qrcodly-eslint-config/node';
import sharedConfig from 'qrcodly-eslint-config/shared';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
export default [
	...nodeConfig,
	sharedConfig(__dirname),
	{
		files: ['src/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
		},
	},
	{
		files: ['src/renderer/**/*.ts', 'src/renderer/**/*.tsx'],
		languageOptions: {
			parserOptions: {
				project: './tsconfig.web.json',
				tsconfigRootDir: __dirname,
			},
		},
	},
	{
		files: ['src/renderer/shims/**/*.ts', 'src/renderer/shims/**/*.tsx'],
		rules: {
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/only-throw-error': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
		},
	},
];
