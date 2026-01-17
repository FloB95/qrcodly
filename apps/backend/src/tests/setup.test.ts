import '@/core/setup';
import { KeyCache } from '@/core/cache';
import { poolConnection } from '@/core/db';
import { cleanUpMockData } from '@/core/db/mock';
import { ObjectStorage } from '@/core/storage';
import { sleep } from '@/utils/general';
import { container } from 'tsyringe';

beforeAll(async () => {
	// clean up Redis cache
	await container.resolve(KeyCache).flushAllCache();
	// clean up the database
	await cleanUpMockData();
});

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(200).toBe(200);
	});
});

afterAll(async () => {
	await cleanUpMockData();
	await sleep(100);
	await container.resolve(ObjectStorage).emptyS3Directory('test/');
	await poolConnection.end();
});
