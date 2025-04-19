import { poolConnection } from '@/core/db';
import { cleanUpMockData } from '@/core/db/mock';
import '@/core/setup';
import { ObjectStorage } from '@/core/storage';
import { sleep } from '@/utils/general';
import { container } from 'tsyringe';

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
	await sleep(100);
	await container.resolve(ObjectStorage).emptyS3Directory('test/');
	await poolConnection.end();
});
