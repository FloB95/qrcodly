import tseslint from 'typescript-eslint';
import base from 'qrcodly-eslint-config/base';

export default tseslint.config(
	{
		ignores: [
			'**/node_modules',
			'**/coverage',
			'**/build',
			'**/jest.config.js',
			'**/drizzle.config.ts',
			'**/prettier.config.cjs',
			'**/artillery-setup.mjs',
			'**/eslint.config.js',
			'scripts/**',
		],
	},
	...base(import.meta.dirname),
	{
		files: ['./src/**/*.ts'],
		rules: {
			'@typescript-eslint/await-thenable': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
		},
	},
	{
		files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
		rules: {
			'@typescript-eslint/unbound-method': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
);
