import { poolConnection } from '@/core/db';
import { cleanUpMockData } from '@/core/db/mock';
import '@/core/setup';

beforeAll(async () => {
	// clean up the database
	await cleanUpMockData();
});

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(200).toBe(200);
	});
});

afterAll(async () => {
	// clean up the database
	await cleanUpMockData();
	await poolConnection.end();
});
