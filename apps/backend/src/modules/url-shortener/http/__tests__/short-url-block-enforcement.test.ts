import { TEST_USER_ID, getTestContext, resetTestState } from '@/tests/shared/test-context';
import db from '@/core/db';
import { eq } from 'drizzle-orm';
import shortUrl from '../../domain/entities/short-url.entity';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, createShortUrl } from './utils';

/**
 * Requirement: once we block a link, its owner cannot switch it back on.
 *
 * The guard lives in UpdateShortUrlUseCase, which every write to `isActive` funnels through. These
 * tests walk each of those entry points from the outside, because a guard that only one caller
 * respects is not a guard.
 */
describe('short URL block enforcement', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	/** Puts a link into the exact state the re-check job leaves behind. */
	const blockShortUrl = async (id: string) => {
		await db
			.update(shortUrl)
			.set({
				isActive: false,
				safetyStatus: 'blocked',
				safetyBlockedAt: new Date(),
				safetyThreatTypes: 'SOCIAL_ENGINEERING',
			})
			.where(eq(shortUrl.id, id))
			.execute();
	};

	const createBlocked = async (): Promise<TShortUrlWithCustomDomainResponseDto> => {
		const created = await createShortUrl(testServer, accessToken);
		await blockShortUrl(created.id);
		return created;
	};

	const readBack = async (id: string) => {
		const [row] = await db.select().from(shortUrl).where(eq(shortUrl.id, id)).execute();
		return row;
	};

	it('exposes the block through the list/detail response', async () => {
		const blocked = await createBlocked();

		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${blocked.shortCode}/detail`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		expect(response).toHaveStatusCode(200);
		const body = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(body.safetyStatus).toBe('blocked');
		expect(body.isActive).toBe(false);
		expect(body.safetyThreatTypes).toBe('SOCIAL_ENGINEERING');
	});

	it('refuses the toggle endpoint with 403 SHORT_URL_BLOCKED', async () => {
		const blocked = await createBlocked();

		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${blocked.shortCode}/toggle-active-state`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		expect(response).toHaveStatusCode(403);
		expect((JSON.parse(response.payload) as { errorCode?: string }).errorCode).toBe(
			'SHORT_URL_BLOCKED',
		);
		expect((await readBack(blocked.id)).isActive).toBe(false);
	});

	it('refuses PATCH with isActive:true with 403', async () => {
		const blocked = await createBlocked();

		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${blocked.shortCode}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: { isActive: true },
		});

		expect(response).toHaveStatusCode(403);
		expect((await readBack(blocked.id)).isActive).toBe(false);
	});

	it('refuses duplicating a blocked link — a clone would work again', async () => {
		const blocked = await createBlocked();

		const response = await testServer.inject({
			method: 'POST',
			url: `${SHORT_URL_API_PATH}/${blocked.shortCode}/duplicate`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		expect(response).toHaveStatusCode(403);
		expect((JSON.parse(response.payload) as { errorCode?: string }).errorCode).toBe(
			'SHORT_URL_BLOCKED',
		);
	});

	it('still allows renaming a blocked link', async () => {
		const blocked = await createBlocked();

		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${blocked.shortCode}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: { name: 'renamed' },
		});

		expect(response).toHaveStatusCode(200);
		const row = await readBack(blocked.id);
		expect(row.name).toBe('renamed');
		// renaming must not quietly lift the block
		expect(row.safetyStatus).toBe('blocked');
		expect(row.isActive).toBe(false);
	});

	it('lifts the block when the destination is changed to a clean one, but leaves it disabled', async () => {
		const blocked = await createBlocked();

		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${blocked.shortCode}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: { destinationUrl: 'https://example.com/somewhere-else' },
		});

		expect(response).toHaveStatusCode(200);
		const row = await readBack(blocked.id);
		expect(row.safetyStatus).toBe('clean');
		expect(row.safetyBlockedAt).toBeNull();
		expect(row.safetyThreatTypes).toBeNull();
		// the owner re-enables deliberately — traffic must not resume on its own
		expect(row.isActive).toBe(false);
		expect(row.nextSafetyCheckAt).not.toBeNull();
	});

	it('can be re-enabled again once the block is gone', async () => {
		const blocked = await createBlocked();

		await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${blocked.shortCode}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: { destinationUrl: 'https://example.com/clean-again' },
		});

		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${blocked.shortCode}/toggle-active-state`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		expect(response).toHaveStatusCode(200);
		expect((await readBack(blocked.id)).isActive).toBe(true);
	});

	it('rejects a destination that is itself one of our short URLs', async () => {
		const target = await createShortUrl(testServer, accessToken);
		const other = await createShortUrl(testServer, accessToken);

		const response = await testServer.inject({
			method: 'PATCH',
			url: `${SHORT_URL_API_PATH}/${other.shortCode}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: { destinationUrl: `https://test.qrcodly.de/u/${target.shortCode}` },
		});

		expect(response).toHaveStatusCode(400);
	});

	it('enrols every newly created link in the re-check queue', async () => {
		// guards the explicit column whitelist in ShortUrlRepository.create(): a field forgotten there
		// is dropped silently, and a link with no due date would never be screened again
		const created = await createShortUrl(testServer, accessToken);
		const row = await readBack(created.id);

		expect(row.nextSafetyCheckAt).not.toBeNull();
		expect(row.nextSafetyCheckAt!.getTime()).toBeGreaterThan(Date.now());
		expect(row.safetyStatus).toBe('unchecked');
		expect(row.createdBy).toBe(TEST_USER_ID);
	});

	it('leaves reserved codes out of the queue until they get a destination', async () => {
		const reserved = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/reserved`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		const body = JSON.parse(reserved.payload) as { id: string };

		expect((await readBack(body.id)).nextSafetyCheckAt).toBeNull();
	});
});
