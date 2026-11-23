import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { MAX_SCAN_IP_EXCLUSIONS, type TScanIpExclusionResponseDto } from '@shared/schemas';
import {
	getTestContext,
	resetTestState,
	TEST_USER_ID,
	TEST_USER_PRO_ID,
} from '@/tests/shared/test-context';
import { ensureProSubscription } from '@/tests/shared/helpers';
import ScanIpExclusionRepository from '../../domain/repository/scan-ip-exclusion.repository';
import {
	cleanupScanIpExclusions,
	createScanIpExclusion,
	insertScanIpExclusion,
} from './scan-ip-exclusion-utils';

describe('POST /scan-ip-exclusion (Create)', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessTokenPro: string;

	beforeAll(async () => {
		await resetTestState();
		({ testServer, accessToken, accessTokenPro } = await getTestContext());
		await ensureProSubscription();
	});

	beforeEach(async () => {
		await cleanupScanIpExclusions(TEST_USER_PRO_ID, TEST_USER_ID);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('creates an entry for a pro user', async () => {
		const response = await createScanIpExclusion(
			testServer,
			{ ipRange: '203.0.113.0/24', label: 'Office' },
			accessTokenPro,
		);

		expect(response).toHaveStatusCode(201);
		const body = JSON.parse(response.payload) as TScanIpExclusionResponseDto;
		expect(body).toMatchObject({ ipRange: '203.0.113.0/24', label: 'Office', updatedAt: null });
		expect(body.id).toBeDefined();
		expect(body.createdAt).toBeDefined();
		expect(body).not.toHaveProperty('createdBy');
	});

	it.each([
		['  2001:DB8:1200:0:0::/48 ', '2001:db8:1200::/48'],
		['198.51.100.77/24', '198.51.100.0/24'],
		['::ffff:203.0.113.7', '203.0.113.7'],
		['203.0.113.7/32', '203.0.113.7'],
	])('stores %p in its normalized form %p', async (ipRange, stored) => {
		const response = await createScanIpExclusion(testServer, { ipRange }, accessTokenPro);

		expect(response).toHaveStatusCode(201);
		expect(JSON.parse(response.payload)).toMatchObject({ ipRange: stored });
	});

	it('stores an empty or missing label as null', async () => {
		const blank = await createScanIpExclusion(
			testServer,
			{ ipRange: '198.51.100.7', label: '  ' },
			accessTokenPro,
		);
		expect(blank).toHaveStatusCode(201);
		expect(JSON.parse(blank.payload)).toMatchObject({ label: null });

		const missing = await createScanIpExclusion(
			testServer,
			{ ipRange: '198.51.100.8' },
			accessTokenPro,
		);
		expect(missing).toHaveStatusCode(201);
		expect(JSON.parse(missing.payload)).toMatchObject({ label: null });
	});

	it('returns 403 for a free user', async () => {
		const response = await createScanIpExclusion(
			testServer,
			{ ipRange: '203.0.113.7' },
			accessToken,
		);
		expect(response).toHaveStatusCode(403);
	});

	it('returns 403 once the plan limit is reached', async () => {
		for (let i = 0; i < MAX_SCAN_IP_EXCLUSIONS; i++) {
			await insertScanIpExclusion(TEST_USER_PRO_ID, `203.0.113.${i}`);
		}

		const response = await createScanIpExclusion(
			testServer,
			{ ipRange: '198.51.100.7' },
			accessTokenPro,
		);
		expect(response).toHaveStatusCode(403);
	});

	it.each([
		['2001:db8::/32', ' 2001:DB8::/32 '],
		['198.51.100.0/24', '198.51.100.200/24'],
		['203.0.113.7', '::ffff:203.0.113.7'],
	])('returns 409 when %p is excluded already and %p is sent', async (stored, ipRange) => {
		await insertScanIpExclusion(TEST_USER_PRO_ID, stored);

		const response = await createScanIpExclusion(testServer, { ipRange }, accessTokenPro);
		expect(response).toHaveStatusCode(409);
	});

	it('returns 409 when a concurrent request inserted the same range first', async () => {
		await insertScanIpExclusion(TEST_USER_PRO_ID, '203.0.113.7');
		// The pre-check misses the row, so the unique index has to catch it
		jest
			.spyOn(container.resolve(ScanIpExclusionRepository), 'findAllByUserId')
			.mockResolvedValueOnce([]);

		const response = await createScanIpExclusion(
			testServer,
			{ ipRange: '203.0.113.7' },
			accessTokenPro,
		);
		expect(response).toHaveStatusCode(409);
	});

	it('allows the same range for different users', async () => {
		await insertScanIpExclusion(TEST_USER_ID, '203.0.113.7');

		const response = await createScanIpExclusion(
			testServer,
			{ ipRange: '203.0.113.7' },
			accessTokenPro,
		);
		expect(response).toHaveStatusCode(201);
	});

	it.each(['not-an-ip', '999.1.1.1', '203.0.113.0/33', ''])(
		'returns 400 for the invalid value %p',
		async (ipRange) => {
			const response = await createScanIpExclusion(testServer, { ipRange }, accessTokenPro);
			expect(response).toHaveStatusCode(400);
		},
	);

	it.each(['10.0.0.0/8', '2001:db8::/16', '::ffff:0:0/96'])(
		'returns 400 for the too wide range %p',
		async (ipRange) => {
			const response = await createScanIpExclusion(testServer, { ipRange }, accessTokenPro);
			expect(response).toHaveStatusCode(400);
		},
	);

	it('returns 401 when not authenticated', async () => {
		const response = await createScanIpExclusion(testServer, { ipRange: '203.0.113.7' });
		expect(response).toHaveStatusCode(401);
	});
});
