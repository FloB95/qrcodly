import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	{
		ignores: [
			'**/node_modules',
			'**/build',
			'**/jest.config.ts',
			'**/drizzle.config.ts',
			'**/prettier.config.cjs',
			'**/artillery-setup.mjs',
			'**/eslint.config.js',
		],
	},
	...compat.extends('plugin:@typescript-eslint/recommended-type-checked'),
	{
		plugins: {
			'@typescript-eslint': typescriptEslint,
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: 5,
			sourceType: 'script',
			parserOptions: {
				project: './tsconfig.json', // Pfad zu deinem tsconfig
				tsconfigRootDir: __dirname,
			},
		},
	},
	...compat
		.extends('plugin:@typescript-eslint/recommended-requiring-type-checking')
		.map((config) => ({
			...config,
			files: ['./src/**/*.ts'],
		})),
	{
		files: ['./src/**/*.ts'],
		rules: {
			'@typescript-eslint/await-thenable': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
				},
			],

			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
				},
			],
		},
		languageOptions: {
			ecmaVersion: 5,
			sourceType: 'script',
		},
	},
];
