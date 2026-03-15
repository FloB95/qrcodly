import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import base from 'qrcodly-eslint-config/base';

// eslint-config-next v16 registers its own @typescript-eslint plugin instance;
// strip it so it doesn't conflict with the one from typescript-eslint
const nextVitalsFiltered = nextVitals.map((config) => {
	if (!config.plugins?.['@typescript-eslint']) return config;
	const { '@typescript-eslint': _, ...plugins } = config.plugins;
	return { ...config, plugins };
});

export default tseslint.config(
	{ ignores: ['.source/**'] },
	...nextVitalsFiltered,
	...base(import.meta.dirname),
	{
		rules: {
			'react-hooks/exhaustive-deps': 'warn',
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/preserve-manual-memoization': 'off',
			'react-hooks/purity': 'off',
			'react-hooks/immutability': 'off',
			'react-hooks/refs': 'off',
			'react-hooks/static-components': 'off',
			'react-hooks/incompatible-library': 'off',
		},
	},
);
