import { pathsToModuleNameMapper, createDefaultPreset } from 'ts-jest';
import { getTsconfig } from 'get-tsconfig';
const { compilerOptions: _compilerOptions } = getTsconfig().config;
// Remove options that require specific moduleResolution values when passing
// the config directly into ts-jest. Some environments may not set
// moduleResolution to 'node16'|'nodenext'|'bundler', causing TS5098.
const { resolvePackageJsonExports, resolvePackageJsonImports, ...compilerOptions } =
	_compilerOptions || {};

const tsJestOptions = {
	tsconfig: {
		...compilerOptions,
		declaration: false,
		sourceMap: true,
	},
};
const jestConfig = {
	...createDefaultPreset(),
	verbose: true,
	preset: 'ts-jest',
	moduleDirectories: ['node_modules', '<rootDir>'],
	moduleNameMapper: {
		...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				...tsJestOptions,
				diagnostics: {
					ignoreCodes: [1343],
				},
				astTransformers: {
					before: [
						{
							path: 'ts-jest-mock-import-meta', // fix for import.meta.url in tests
						},
					],
				},
			},
		],
	},
	testEnvironment: 'node',
	setupFilesAfterEnv: ['<rootDir>/src/tests/setup.test.ts'],
	testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/build/'],
	testTimeout: 30000,
};

export default jestConfig;
