import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import {
	type TShortUrlWithCustomDomainPaginatedResponseDto,
	QrCodeDefaults,
} from '@shared/schemas';
import { SHORT_URL_API_PATH, createShortUrl } from './utils';
import { API_BASE_PATH } from '@/core/config/constants';
import qs from 'qs';

const TAG_API_PATH = `${API_BASE_PATH}/tag`;
const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

describe('listShortUrls', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let userId: string;
	let user2Id: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		userId = ctx.user.id;
		user2Id = ctx.user2.id;
	});

	const listShortUrlsRequest = async (token: string, queryParams: Record<string, unknown> = {}) => {
		return testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}?${qs.stringify(queryParams)}`,
			headers: { Authorization: `Bearer ${token}` },
		});
	};

	const createTag = async (token: string, name: string) => {
		const response = await testServer.inject({
			method: 'POST',
			url: TAG_API_PATH,
			headers: { Authorization: `Bearer ${token}` },
			payload: { name, color: '#FF5733' },
		});
		expect(response).toHaveStatusCode(201);
		return JSON.parse(response.payload);
	};

	const assignTagsToShortUrl = async (token: string, shortUrlId: string, tagIds: string[]) => {
		const response = await testServer.inject({
			method: 'PUT',
			url: `${TAG_API_PATH}/short-url/${shortUrlId}`,
			headers: { Authorization: `Bearer ${token}` },
			payload: { tagIds },
		});
		expect(response).toHaveStatusCode(200);
	};

	it('should return paginated list of standalone short URLs', async () => {
		await createShortUrl(testServer, accessToken);

		const response = await listShortUrlsRequest(accessToken, { standalone: true });
		expect(response).toHaveStatusCode(200);

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

		const response1 = await listShortUrlsRequest(accessToken, { standalone: true });
		const data1 = JSON.parse(response1.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;

		const response2 = await listShortUrlsRequest(accessToken2, { standalone: true });
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
			standalone: true,
			page: 1,
			limit: 1,
		});
		expect(response).toHaveStatusCode(200);

		const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
		expect(data.data.length).toBeLessThanOrEqual(1);
		expect(data.limit).toBe(1);
	});

	it('should filter by search term across shortCode and destinationUrl', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await listShortUrlsRequest(accessToken, {
			standalone: true,
			where: { shortCode: { like: shortUrl.shortCode } },
		});
		expect(response).toHaveStatusCode(200);

		const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
		expect(data.data.length).toBeGreaterThanOrEqual(1);
		expect(data.data.some((su) => su.shortCode === shortUrl.shortCode)).toBe(true);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: SHORT_URL_API_PATH,
		});
		expect(response).toHaveStatusCode(401);
	});

	it('should include tags and name in list response items', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken, { name: 'List Tag Test' });

		const response = await listShortUrlsRequest(accessToken, { standalone: true });
		expect(response).toHaveStatusCode(200);

		const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
		const found = data.data.find((su) => su.id === shortUrl.id);
		expect(found).toBeDefined();
		expect(found!.name).toBe('List Tag Test');
		expect(found!.tags).toEqual(expect.any(Array));
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
		const response = await listShortUrlsRequest(accessToken, { standalone: true });
		const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
		expect(data.data.find((su) => su.id === shortUrl.id)).toBeUndefined();
	});

	describe('standalone filter (no QR code short URLs)', () => {
		it('should not include short URLs linked to QR codes when standalone=true', async () => {
			// Create a QR code with dynamic URL (which creates a linked short URL)
			const qrResponse = await testServer.inject({
				method: 'POST',
				url: QR_CODE_API_PATH,
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				payload: {
					name: 'QR for standalone test',
					content: {
						type: 'url',
						data: { url: 'https://example.com/standalone-test', isDynamic: true },
					},
					config: QrCodeDefaults,
				},
			});
			expect(qrResponse.statusCode).toBe(201);

			// List standalone short URLs - should NOT contain QR-linked ones
			const response = await listShortUrlsRequest(accessToken, { standalone: true });
			const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;

			// Every returned short URL must have qrCodeId as null
			for (const su of data.data) {
				expect(su.qrCodeId).toBeNull();
			}
		});
	});

	describe('tagIds filter', () => {
		it('should filter short URLs by tag ID', async () => {
			const tag = await createTag(accessToken, `FilterTag ${Date.now()}`);
			const shortUrl = await createShortUrl(testServer, accessToken, {
				name: `Tagged SU ${Date.now()}`,
			});
			await assignTagsToShortUrl(accessToken, shortUrl.id, [tag.id]);

			const response = await listShortUrlsRequest(accessToken, {
				standalone: true,
				tagIds: [tag.id],
			});

			expect(response).toHaveStatusCode(200);
			const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
			expect(data.total).toBe(1);
			expect(data.data).toHaveLength(1);
			expect(data.data[0].id).toBe(shortUrl.id);
		});

		it('should return empty results for tag with no short URLs', async () => {
			const tag = await createTag(accessToken, `EmptyTag ${Date.now()}`);

			const response = await listShortUrlsRequest(accessToken, {
				standalone: true,
				tagIds: [tag.id],
			});

			expect(response).toHaveStatusCode(200);
			const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
			expect(data.total).toBe(0);
			expect(data.data).toHaveLength(0);
		});

		it('should filter by multiple tag IDs (OR logic)', async () => {
			const tag1 = await createTag(accessToken, `MultiTag1 ${Date.now()}`);
			const tag2 = await createTag(accessToken, `MultiTag2 ${Date.now()}`);
			const shortUrl1 = await createShortUrl(testServer, accessToken, {
				name: `Multi1 ${Date.now()}`,
			});
			const shortUrl2 = await createShortUrl(testServer, accessToken, {
				name: `Multi2 ${Date.now()}`,
			});
			await assignTagsToShortUrl(accessToken, shortUrl1.id, [tag1.id]);
			await assignTagsToShortUrl(accessToken, shortUrl2.id, [tag2.id]);

			const response = await listShortUrlsRequest(accessToken, {
				standalone: true,
				tagIds: [tag1.id, tag2.id],
			});

			expect(response).toHaveStatusCode(200);
			const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
			expect(data.total).toBe(2);
			const ids = data.data.map((su) => su.id);
			expect(ids).toContain(shortUrl1.id);
			expect(ids).toContain(shortUrl2.id);
		});

		it('should return correct total count when filtering by tags', async () => {
			const tag = await createTag(accessToken, `CountTag ${Date.now()}`);
			const shortUrl1 = await createShortUrl(testServer, accessToken);
			const shortUrl2 = await createShortUrl(testServer, accessToken);
			await createShortUrl(testServer, accessToken); // untagged

			await assignTagsToShortUrl(accessToken, shortUrl1.id, [tag.id]);
			await assignTagsToShortUrl(accessToken, shortUrl2.id, [tag.id]);

			const response = await listShortUrlsRequest(accessToken, {
				standalone: true,
				tagIds: [tag.id],
			});

			expect(response).toHaveStatusCode(200);
			const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
			expect(data.total).toBe(2);
			expect(data.data).toHaveLength(2);
		});

		it('should combine tag filter with search filter', async () => {
			const uniqueName = `SearchTagCombo ${Date.now()}`;
			const tag = await createTag(accessToken, `ComboTag ${Date.now()}`);
			const shortUrl = await createShortUrl(testServer, accessToken, { name: uniqueName });
			await createShortUrl(testServer, accessToken); // no tag, different name
			await assignTagsToShortUrl(accessToken, shortUrl.id, [tag.id]);

			const response = await listShortUrlsRequest(accessToken, {
				standalone: true,
				tagIds: [tag.id],
				where: { shortCode: { like: shortUrl.shortCode } },
			});

			expect(response).toHaveStatusCode(200);
			const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
			expect(data.total).toBe(1);
			expect(data.data[0].id).toBe(shortUrl.id);
		});

		it('should include tags in filtered results', async () => {
			const tag = await createTag(accessToken, `IncludeTag ${Date.now()}`);
			const shortUrl = await createShortUrl(testServer, accessToken);
			await assignTagsToShortUrl(accessToken, shortUrl.id, [tag.id]);

			const response = await listShortUrlsRequest(accessToken, {
				standalone: true,
				tagIds: [tag.id],
			});

			expect(response).toHaveStatusCode(200);
			const data = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
			const found = data.data.find((su) => su.id === shortUrl.id);
			expect(found).toBeDefined();
			expect(found!.tags).toHaveLength(1);
			expect(found!.tags[0].id).toBe(tag.id);
		});
	});
});
