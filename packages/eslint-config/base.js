import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';
import unicorn from 'eslint-plugin-unicorn';
import lodash from 'eslint-plugin-lodash';
import unusedImports from 'eslint-plugin-unused-imports';

/**
 * Shared ESLint base config for all workspace apps.
 * Provides TypeScript type-checked rules, common plugins, and Prettier.
 * Each app extends this and adds its own framework-specific config.
 *
 * @param {string} tsconfigRootDir - absolute path to the app root (use import.meta.dirname)
 * @returns {import('typescript-eslint').ConfigArray}
 */
export default function base(tsconfigRootDir) {
	return tseslint.config(
		{
			plugins: { unicorn, lodash, 'unused-imports': unusedImports },
		},
		{
			files: ['**/*.ts', '**/*.tsx'],
			extends: [...tseslint.configs.recommendedTypeChecked],
			languageOptions: {
				parserOptions: {
					project: './tsconfig.json',
					tsconfigRootDir,
				},
			},
			rules: {
				'@typescript-eslint/consistent-type-imports': [
					'warn',
					{ prefer: 'type-imports', fixStyle: 'inline-type-imports' },
				],
				'@typescript-eslint/no-unused-vars': [
					'warn',
					{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
				],
				'@typescript-eslint/no-floating-promises': 'error',
				'@typescript-eslint/no-misused-promises': [
					'error',
					{ checksVoidReturn: { attributes: false } },
				],
				'@typescript-eslint/require-await': 'off',
				'@typescript-eslint/no-explicit-any': 'warn',
				'@typescript-eslint/no-unsafe-assignment': 'off',
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-unsafe-argument': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-return': 'off',
				'@typescript-eslint/no-empty-function': 'off',
				'@typescript-eslint/restrict-template-expressions': 'off',
				'@typescript-eslint/prefer-nullish-coalescing': 'off',
			},
		},
		prettier,
		{ linterOptions: { reportUnusedDisableDirectives: true } },
	);
}
