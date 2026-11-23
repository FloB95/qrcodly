import type { FastifyInstance } from 'fastify';
import { isIP } from 'node:net';
import { type TCurrentClientIpResponseDto } from '@shared/schemas';
import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { getCurrentIp } from './scan-ip-exclusion-utils';

describe('GET /scan-ip-exclusion/current-ip', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		({ testServer, accessToken } = await getTestContext());
	});

	it('returns the IP the API sees for the caller', async () => {
		const response = await getCurrentIp(testServer, accessToken, {
			'x-forwarded-for': '198.51.100.7',
		});

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ ip: '198.51.100.7' });
	});

	it('returns a valid IP without proxy headers', async () => {
		const response = await getCurrentIp(testServer, accessToken);

		expect(response).toHaveStatusCode(200);
		const { ip } = JSON.parse(response.payload) as TCurrentClientIpResponseDto;
		expect(isIP(ip ?? '')).not.toBe(0);
	});

	it('returns null when the address the API sees is not an IP', async () => {
		const response = await getCurrentIp(testServer, accessToken, {
			'x-forwarded-for': 'unknown',
		});

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ ip: null });
	});

	it('returns 401 when not authenticated', async () => {
		const response = await getCurrentIp(testServer);
		expect(response).toHaveStatusCode(401);
	});
});
