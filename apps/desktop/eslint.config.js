import base from 'qrcodly-eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
	...base(import.meta.dirname),
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
				tsconfigRootDir: import.meta.dirname,
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
