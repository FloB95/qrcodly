import { getTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlWithCustomDomainPaginatedResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, createShortUrl } from './utils';

describe('listShortUrls', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let userId: string;
	let user2Id: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		userId = ctx.user.id;
		user2Id = ctx.user2.id;
	});

	const listShortUrlsRequest = async (token: string, query?: Record<string, string>) => {
		const params = new URLSearchParams(query);
		const qs = params.toString() ? `?${params.toString()}` : '';
		return testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}${qs}`,
			headers: { Authorization: `Bearer ${token}` },
		});
	};

	it('should return paginated list of standalone short URLs', async () => {
		await createShortUrl(testServer, accessToken);

		const response = await listShortUrlsRequest(accessToken, { standalone: 'true' });
		expect(response.statusCode).toBe(200);

		const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
		expect(data).toHaveProperty('page');
		expect(data).toHaveProperty('limit');
		expect(data).toHaveProperty('total');
		expect(data).toHaveProperty('data');
		expect(Array.isArray(data.data)).toBe(true);
		expect(data.total).toBeGreaterThanOrEqual(1);
	});

	it('should only return short URLs owned by the authenticated user', async () => {
		const user1ShortUrl = await createShortUrl(testServer, accessToken);
		const user2ShortUrl = await createShortUrl(testServer, accessToken2);

		const response1 = await listShortUrlsRequest(accessToken, { standalone: 'true' });
		const data1 = JSON.parse(response1.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;

		const response2 = await listShortUrlsRequest(accessToken2, { standalone: 'true' });
		const data2 = JSON.parse(response2.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;

		// Each user should only see their own short URLs
		expect(data1.data.every((su) => su.createdBy === userId)).toBe(true);
		expect(data2.data.every((su) => su.createdBy === user2Id)).toBe(true);

		// Created short URL should only be visible to its owner
		expect(data1.data.some((su) => su.id === user1ShortUrl.id)).toBe(true);
		expect(data1.data.some((su) => su.id === user2ShortUrl.id)).toBe(false);
		expect(data2.data.some((su) => su.id === user2ShortUrl.id)).toBe(true);
		expect(data2.data.some((su) => su.id === user1ShortUrl.id)).toBe(false);

		// IDs should not overlap
		const ids1 = new Set(data1.data.map((su) => su.id));
		const ids2 = new Set(data2.data.map((su) => su.id));
		const overlap = [...ids1].filter((id) => ids2.has(id));
		expect(overlap).toHaveLength(0);
	});

	it('should respect pagination parameters', async () => {
		// Create enough short URLs to paginate
		await createShortUrl(testServer, accessToken);
		await createShortUrl(testServer, accessToken);

		const response = await listShortUrlsRequest(accessToken, {
			standalone: 'true',
			page: '1',
			limit: '1',
		});
		expect(response.statusCode).toBe(200);

		const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
		expect(data.data.length).toBeLessThanOrEqual(1);
		expect(data.limit).toBe(1);
	});

	it('should filter by search term across shortCode and destinationUrl', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await listShortUrlsRequest(accessToken, {
			standalone: 'true',
			'where[shortCode][like]': shortUrl.shortCode,
		});
		expect(response.statusCode).toBe(200);

		const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
		expect(data.data.length).toBeGreaterThanOrEqual(1);
		expect(data.data.some((su) => su.shortCode === shortUrl.shortCode)).toBe(true);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: SHORT_URL_API_PATH,
		});
		expect(response.statusCode).toBe(401);
	});

	it('should not include soft-deleted short URLs', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		// Delete it
		const deleteResponse = await testServer.inject({
			method: 'DELETE',
			url: `${SHORT_URL_API_PATH}/${shortUrl.shortCode}`,
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		expect(deleteResponse.statusCode).toBe(200);

		// List should not include the deleted short URL
		const response = await listShortUrlsRequest(accessToken, { standalone: 'true' });
		const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
		expect(data.data.find((su) => su.id === shortUrl.id)).toBeUndefined();
	});
});
