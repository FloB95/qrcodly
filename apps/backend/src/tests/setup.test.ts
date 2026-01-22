import '@/core/setup';
import { beforeAllTests, afterAllTests } from '@/tests/shared/test-context';

/**
 * Global test setup file.
 *
 * This file is configured in jest.config.js as setupFilesAfterEnv.
 * The beforeAll/afterAll hooks here run once for the entire test suite.
 */

beforeAll(async () => {
	await beforeAllTests();
});

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(200).toBe(200);
	});
});

afterAll(async () => {
	await afterAllTests();
});
