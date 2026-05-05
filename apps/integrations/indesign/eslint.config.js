import base from 'qrcodly-eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
	...base(import.meta.dirname),
	{
		files: ['src/**/*.{ts,tsx}'],
		rules: {
			// UXP host APIs are loosely typed; we already cast at boundaries.
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
		},
	},
];
