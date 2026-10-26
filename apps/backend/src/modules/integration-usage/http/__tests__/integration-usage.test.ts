import { container } from 'tsyringe';
import { type FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import db from '@/core/db';
import { integrationUsage, type TIntegrationUsage } from '@/core/db/schemas';
import { KeyCache } from '@/core/cache';
import { API_BASE_PATH } from '@/core/config/constants';
import { EventEmitter } from '@/core/event/event.emitter';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { getTestContext, resetTestState, TEST_USER_ID } from '@/tests/shared/test-context';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Usage is recorded fire-and-forget after the response, so poll for it. */
async function waitForUsage(
	client: string,
	predicate: (row: TIntegrationUsage) => boolean = () => true,
) {
	for (let attempt = 0; attempt < 50; attempt++) {
		const row = await db.query.integrationUsage.findFirst({
			where: and(eq(integrationUsage.userId, TEST_USER_ID), eq(integrationUsage.client, client)),
		});
		if (row && predicate(row)) return row;
		await sleep(100);
	}
	throw new Error(`No matching integration usage for ${client}`);
}

describe('integration usage tracking', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let cache: KeyCache;

	const listQrCodes = (clientHeader?: string) =>
		testServer.inject({
			method: 'GET',
			url: QR_CODE_API_PATH,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				...(clientHeader ? { 'X-QRcodly-Client': clientHeader } : {}),
			},
		});

	const clearThrottle = async () => {
		const redis = cache.getClient();
		const keys = await redis.keys(`integration_usage:${TEST_USER_ID}:*`);
		if (keys.length > 0) await redis.del(...keys);
	};

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		cache = container.resolve(KeyCache);
	});

	beforeEach(async () => {
		await clearThrottle();
		await db.delete(integrationUsage).where(eq(integrationUsage.userId, TEST_USER_ID)).execute();
	});

	it('records the client and version the request declares', async () => {
		const response = await listQrCodes('figma/0.4.2');

		expect(response.statusCode).toBe(200);
		const row = await waitForUsage('figma');
		expect(row).toMatchObject({ userId: TEST_USER_ID, client: 'figma', lastVersion: '0.4.2' });
		expect(row.firstSeenAt).toEqual(row.lastSeenAt);
	});

	it('falls back to the web app for a session token without the header', async () => {
		await listQrCodes();

		const row = await waitForUsage('web');
		expect(row.lastVersion).toBeNull();
	});

	it('writes at most once per hour per client, whatever version it reports', async () => {
		await listQrCodes('indesign/0.3.0');
		const first = await waitForUsage('indesign');
		const longAgo = new Date('2026-01-01T00:00:00Z');
		await db
			.update(integrationUsage)
			.set({ lastSeenAt: longAgo })
			.where(eq(integrationUsage.id, first.id))
			.execute();

		await listQrCodes('indesign/0.4.0');
		await sleep(500);
		const throttled = await waitForUsage('indesign');
		expect(throttled).toMatchObject({ lastSeenAt: longAgo, lastVersion: '0.3.0' });

		await clearThrottle();
		await listQrCodes('indesign/0.4.0');
		const upgraded = await waitForUsage('indesign', (row) => row.lastVersion === '0.4.0');
		expect(upgraded.id).toBe(first.id);
		expect(upgraded.lastSeenAt.getTime()).toBeGreaterThan(longAgo.getTime());
		expect(upgraded.firstSeenAt).toEqual(first.firstSeenAt);
	});

	it('keeps the last known version when a request carries none', async () => {
		await listQrCodes('figma/0.4.2');
		const first = await waitForUsage('figma');
		const longAgo = new Date('2026-01-01T00:00:00Z');
		await db
			.update(integrationUsage)
			.set({ lastSeenAt: longAgo })
			.where(eq(integrationUsage.id, first.id))
			.execute();

		await clearThrottle();
		await listQrCodes('figma');
		const row = await waitForUsage('figma', (r) => r.lastSeenAt > longAgo);
		expect(row.lastVersion).toBe('0.4.2');
	});

	it('deletes the usage rows when the user is deleted', async () => {
		await listQrCodes('figma/0.4.2');
		await waitForUsage('figma');

		container.resolve(EventEmitter).emit(new UserDeletedEvent({ id: TEST_USER_ID }));

		for (let attempt = 0; attempt < 50; attempt++) {
			const rows = await db.query.integrationUsage.findMany({
				where: eq(integrationUsage.userId, TEST_USER_ID),
			});
			if (rows.length === 0) return;
			await sleep(100);
		}
		throw new Error('Integration usage was not deleted');
	});

	it('allows the client header in CORS preflights', async () => {
		const response = await testServer.inject({
			method: 'OPTIONS',
			url: QR_CODE_API_PATH,
			headers: {
				Origin: 'https://www.qrcodly.de',
				'Access-Control-Request-Method': 'GET',
				'Access-Control-Request-Headers': 'authorization,x-qrcodly-client',
			},
		});

		expect(response.statusCode).toBe(204);
		expect(response.headers['access-control-allow-headers']).toContain('X-QRcodly-Client');
	});
});
