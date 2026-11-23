import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import {
	getTestContext,
	resetTestState,
	TEST_USER_2_ID,
	TEST_USER_ID,
	TEST_USER_PRO_ID,
} from '@/tests/shared/test-context';
import { ensureProSubscription } from '@/tests/shared/helpers';
import {
	cleanupScanIpExclusions,
	deleteScanIpExclusion,
	findScanIpExclusion,
	insertScanIpExclusion,
} from './scan-ip-exclusion-utils';

describe('DELETE /scan-ip-exclusion/:id (Delete)', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessTokenPro: string;

	beforeAll(async () => {
		await resetTestState();
		({ testServer, accessToken, accessTokenPro } = await getTestContext());
		await ensureProSubscription();
	});

	beforeEach(async () => {
		await cleanupScanIpExclusions(TEST_USER_PRO_ID, TEST_USER_ID, TEST_USER_2_ID);
	});

	it('deletes an own entry', async () => {
		const id = await insertScanIpExclusion(TEST_USER_PRO_ID, '203.0.113.7');

		const response = await deleteScanIpExclusion(testServer, id, accessTokenPro);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ deleted: true });
		expect(await findScanIpExclusion(id)).toBeUndefined();
	});

	it('lets a free user delete entries left from their Pro time', async () => {
		const id = await insertScanIpExclusion(TEST_USER_ID, '203.0.113.7');

		const response = await deleteScanIpExclusion(testServer, id, accessToken);

		expect(response).toHaveStatusCode(200);
		expect(await findScanIpExclusion(id)).toBeUndefined();
	});

	it("returns 404 for another user's entry and keeps it", async () => {
		const id = await insertScanIpExclusion(TEST_USER_2_ID, '203.0.113.7');

		const response = await deleteScanIpExclusion(testServer, id, accessTokenPro);

		expect(response).toHaveStatusCode(404);
		expect(await findScanIpExclusion(id)).toBeDefined();
	});

	it('returns 404 for an unknown id', async () => {
		const response = await deleteScanIpExclusion(testServer, randomUUID(), accessTokenPro);
		expect(response).toHaveStatusCode(404);
	});

	it('returns 401 when not authenticated', async () => {
		const id = await insertScanIpExclusion(TEST_USER_PRO_ID, '203.0.113.7');
		const response = await deleteScanIpExclusion(testServer, id);
		expect(response).toHaveStatusCode(401);
		expect(await findScanIpExclusion(id)).toBeDefined();
	});
});
