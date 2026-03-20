import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { TAG_API_PATH, createTagRequest } from './utils';
import { createShortUrl } from '@/modules/url-shortener/http/__tests__/utils';
import { generateDynamicUrlQrCodeDto } from '@/modules/qr-code/http/__tests__/utils';
import { API_BASE_PATH } from '@/core/config/constants';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';

describe('setShortUrlTags', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	const setShortUrlTagsRequest = async (shortUrlId: string, token?: string, body?: any) =>
		testServer.inject({
			method: 'PUT',
			url: `${TAG_API_PATH}/short-url/${shortUrlId}`,
			headers: {
				Authorization: token ? `Bearer ${token}` : '',
			},
			...(body ? { payload: body } : {}),
		});

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	it('should set tags on a short URL', async () => {
		const tag = await createTagRequest(testServer, { name: 'SU Tag ' + Date.now() }, accessToken);
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await setShortUrlTagsRequest(shortUrl.id, accessToken, {
			tagIds: [tag.id],
		});

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(Array.isArray(tags)).toBe(true);
		expect(tags.length).toBe(1);
		expect(tags[0].id).toBe(tag.id);
	});

	it('should clear tags when empty array is passed', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await setShortUrlTagsRequest(shortUrl.id, accessToken, { tagIds: [] });

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(0);
	});

	it('should return 401 without auth token', async () => {
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await setShortUrlTagsRequest(shortUrl.id, undefined, { tagIds: [] });

		expect(response).toHaveStatusCode(401);
	});

	it('should return 404 for non-existent short URL', async () => {
		const response = await setShortUrlTagsRequest(
			'00000000-0000-0000-0000-000000000000',
			accessToken,
			{ tagIds: [] },
		);

		expect(response).toHaveStatusCode(404);
	});

	it('should return 403 when setting tags on another user short URL', async () => {
		const tag = await createTagRequest(
			testServer,
			{ name: 'IDOR SU Tag ' + Date.now() },
			accessToken,
		);
		const shortUrl = await createShortUrl(testServer, accessToken2);

		const response = await setShortUrlTagsRequest(shortUrl.id, accessToken, {
			tagIds: [tag.id],
		});

		expect(response).toHaveStatusCode(403);
	});

	it('should return 403 when using another user tags', async () => {
		const user2Tag = await createTagRequest(
			testServer,
			{ name: 'User2 SU Tag IDOR ' + Date.now() },
			accessToken2,
		);
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await setShortUrlTagsRequest(shortUrl.id, accessToken, {
			tagIds: [user2Tag.id],
		});

		expect(response).toHaveStatusCode(403);
	});

	it('should allow any user to set up to 3 tags', async () => {
		const tag1 = await createTagRequest(
			testServer,
			{ name: 'SU Multi A ' + Date.now() },
			accessToken,
		);
		const tag2 = await createTagRequest(
			testServer,
			{ name: 'SU Multi B ' + Date.now() },
			accessToken,
		);
		const tag3 = await createTagRequest(
			testServer,
			{ name: 'SU Multi C ' + Date.now() },
			accessToken,
		);
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await setShortUrlTagsRequest(shortUrl.id, accessToken, {
			tagIds: [tag1.id, tag2.id, tag3.id],
		});

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(3);
	});

	it('should return 400 when trying to set more than 3 tags', async () => {
		const tags = await Promise.all(
			Array.from({ length: 4 }, (_, i) =>
				createTagRequest(testServer, { name: `SU Limit ${i} ` + Date.now() }, accessToken),
			),
		);
		const shortUrl = await createShortUrl(testServer, accessToken);

		const response = await setShortUrlTagsRequest(shortUrl.id, accessToken, {
			tagIds: tags.map((t) => t.id),
		});

		expect(response).toHaveStatusCode(400);
		const body = JSON.parse(response.payload);
		expect(body.message).toContain('You can add a maximum of 3 tags');
	});

	it('should replace existing tags with new ones', async () => {
		const tag1 = await createTagRequest(
			testServer,
			{ name: 'SU Replace A ' + Date.now() },
			accessToken,
		);
		const tag2 = await createTagRequest(
			testServer,
			{ name: 'SU Replace B ' + Date.now() },
			accessToken,
		);
		const shortUrl = await createShortUrl(testServer, accessToken);

		// Set first tag
		await setShortUrlTagsRequest(shortUrl.id, accessToken, { tagIds: [tag1.id] });

		// Replace with second tag
		const response = await setShortUrlTagsRequest(shortUrl.id, accessToken, {
			tagIds: [tag2.id],
		});

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(1);
		expect(tags[0].id).toBe(tag2.id);
	});

	it('should default to empty tags when tagIds is omitted', async () => {
		const tag = await createTagRequest(
			testServer,
			{ name: 'SU Default Tag ' + Date.now() },
			accessToken,
		);
		const shortUrl = await createShortUrl(testServer, accessToken);

		// First set a tag
		await setShortUrlTagsRequest(shortUrl.id, accessToken, { tagIds: [tag.id] });

		// Then send empty body (tagIds defaults to [])
		const response = await setShortUrlTagsRequest(shortUrl.id, accessToken, {});

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(0);
	});

	it('should return 400 when trying to set tags on a QR-code-linked short URL', async () => {
		const tag = await createTagRequest(
			testServer,
			{ name: 'QR Linked Tag ' + Date.now() },
			accessToken,
		);

		// Create a dynamic URL QR code (which has a linked short URL)
		const createResponse = await testServer.inject({
			method: 'POST',
			url: `${API_BASE_PATH}/qr-code`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			payload: generateDynamicUrlQrCodeDto(),
		});
		expect(createResponse.statusCode).toBe(201);
		const qrCode = JSON.parse(createResponse.payload) as TQrCodeWithRelationsResponseDto;
		expect(qrCode.shortUrl).not.toBeNull();

		const response = await setShortUrlTagsRequest(qrCode.shortUrl!.id, accessToken, {
			tagIds: [tag.id],
		});

		expect(response).toHaveStatusCode(400);
		const body = JSON.parse(response.payload);
		expect(body.message).toContain('linked to a QR code');
	});
});
