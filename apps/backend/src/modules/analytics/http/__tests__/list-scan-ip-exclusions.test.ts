import type { FastifyInstance } from 'fastify';
import { type TScanIpExclusionListResponseDto } from '@shared/schemas';
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
	insertScanIpExclusion,
	listScanIpExclusions,
} from './scan-ip-exclusion-utils';

describe('GET /scan-ip-exclusion (List)', () => {
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

	it('returns an empty list', async () => {
		const response = await listScanIpExclusions(testServer, accessTokenPro);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual([]);
	});

	it('returns only own entries, oldest first', async () => {
		const now = Date.now();
		const newer = await insertScanIpExclusion(TEST_USER_PRO_ID, '198.51.100.7', new Date(now));
		const older = await insertScanIpExclusion(
			TEST_USER_PRO_ID,
			'203.0.113.0/24',
			new Date(now - 60_000),
		);
		await insertScanIpExclusion(TEST_USER_2_ID, '192.0.2.1');

		const response = await listScanIpExclusions(testServer, accessTokenPro);

		expect(response).toHaveStatusCode(200);
		const body = JSON.parse(response.payload) as TScanIpExclusionListResponseDto;
		expect(body.map((e) => e.id)).toEqual([older, newer]);
		expect(body[0]).toMatchObject({ ipRange: '203.0.113.0/24', label: null });
		expect(body[0]).not.toHaveProperty('createdBy');
	});

	it('still lists entries of a free user', async () => {
		await insertScanIpExclusion(TEST_USER_ID, '203.0.113.7');

		const response = await listScanIpExclusions(testServer, accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toHaveLength(1);
	});

	it('returns 401 when not authenticated', async () => {
		const response = await listScanIpExclusions(testServer);
		expect(response).toHaveStatusCode(401);
	});
});
