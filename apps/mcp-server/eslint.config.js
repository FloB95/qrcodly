import tseslint from 'typescript-eslint';
import base from 'qrcodly-eslint-config/base';

export default tseslint.config(
	{
		ignores: ['**/node_modules', '**/build', '**/dist', '**/eslint.config.js'],
	},
	...base(import.meta.dirname),
	{
		files: ['./src/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
);
