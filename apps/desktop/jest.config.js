/** @type {import('jest').Config} */
export default {
	testEnvironment: 'node',
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.test.json',
			},
		],
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	testMatch: ['<rootDir>/__tests__/main/**/*.test.ts'],
	testTimeout: 30000,
	forceExit: true,
};
