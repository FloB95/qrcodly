import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';
import unicorn from 'eslint-plugin-unicorn';
import lodash from 'eslint-plugin-lodash';
import unusedImports from 'eslint-plugin-unused-imports';

// Remove @typescript-eslint plugin from next config to avoid conflict
// with typescript-eslint's own plugin registration
const nextVitalsFiltered = nextVitals.map((config) => {
	if (!config.plugins?.['@typescript-eslint']) return config;
	const { '@typescript-eslint': _, ...plugins } = config.plugins;
	return { ...config, plugins };
});

export default tseslint.config(
	{ ignores: ['.source/**'] },
	...nextVitalsFiltered,
	{
		plugins: { unicorn, lodash, 'unused-imports': unusedImports },
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'react-hooks/exhaustive-deps': 'off',
			'@typescript-eslint/array-type': 'off',
			'@typescript-eslint/consistent-type-definitions': 'off',
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{ prefer: 'type-imports', fixStyle: 'inline-type-imports' },
			],
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{ checksVoidReturn: { attributes: false } },
			],
			// TODO: promote to error and fix violations
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/no-floating-promises': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-empty-function': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
			'@typescript-eslint/prefer-for-of': 'warn',
			'@typescript-eslint/prefer-regexp-exec': 'warn',
		},
	},
	{
		// TODO: fix violations and promote back to error
		rules: {
			'@next/next/no-html-link-for-pages': 'warn',
			'react-hooks/rules-of-hooks': 'warn',
			'react-hooks/set-state-in-effect': 'warn',
			'react-hooks/preserve-manual-memoization': 'warn',
			'react-hooks/purity': 'warn',
			'react-hooks/immutability': 'warn',
			'react-hooks/refs': 'warn',
			'react-hooks/static-components': 'warn',
		},
	},
	prettier,
	{ linterOptions: { reportUnusedDisableDirectives: true } },
);
