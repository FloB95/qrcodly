import tsParser from '@typescript-eslint/parser';

/**
 * @type {(tsconfigRootDir: string) => import('eslint').Linter.Config}
 */
export default (tsconfigRootDir) => {
	/**
	 * @type {import("@typescript-eslint/parser").ParserOptions}
	 */
	const extraParserOptions = {
		ecmaVersion: 2020,
		sourceType: 'module',
	};

	const settings = {
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts'],
		},
		'import/resolver': {
			typescript: {
				tsconfigRootDir,
				project: './tsconfig.json',
			},
		},
	};

	return {
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.json',
				...extraParserOptions,
			},
		},
		settings,
	};
};
