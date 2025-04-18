import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import importPlugin from 'eslint-plugin-import';
import lodash from 'eslint-plugin-lodash';
import unusedImports from 'eslint-plugin-unused-imports';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		ignores: [
			'node_modules/**',
			'dist/**',
			'**/jest.config.js',
			'**/eslint.config.js',
			'**/drizzle.config.ts',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		plugins: {
			import: importPlugin,
			unicorn,
			lodash,
			'unused-imports': unusedImports,
		},
		rules: {
			'@typescript-eslint/await-thenable': 'warn',
		},
	},
];
