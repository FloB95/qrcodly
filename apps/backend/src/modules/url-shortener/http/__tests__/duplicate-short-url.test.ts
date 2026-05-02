import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, createShortUrl } from './utils';
import { API_BASE_PATH } from '@/core/config/constants';

const TAG_API_PATH = `${API_BASE_PATH}/tag`;

describe('duplicateShortUrl', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	const duplicateRequest = async (shortCode: string, token?: string) =>
		testServer.inject({
			method: 'POST',
			url: `${SHORT_URL_API_PATH}/${shortCode}/duplicate`,
			headers: {
				...(token && { Authorization: `Bearer ${token}` }),
			},
		});

	it('should duplicate a short URL and return 201', async () => {
		const source = await createShortUrl(testServer, accessToken, { name: 'My Link' });

		const response = await duplicateRequest(source.shortCode, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(duplicate.id).not.toBe(source.id);
		expect(duplicate.shortCode).not.toBe(source.shortCode);
		expect(duplicate.destinationUrl).toBe(source.destinationUrl);
		expect(duplicate.isActive).toBe(source.isActive);
		expect(duplicate.name).toBe(`(Copy) ${source.name}`);
		expect(duplicate.qrCodeId).toBeNull();
	});

	it('should return 401 when not authenticated', async () => {
		const response = await duplicateRequest('XXXXX');
		expect(response).toHaveStatusCode(401);
	});

	it('should return 404 for non-existent short code', async () => {
		const response = await duplicateRequest('XXXXX', accessToken);
		expect(response).toHaveStatusCode(404);
	});

	it("should return 403 when duplicating another user's short URL", async () => {
		const source = await createShortUrl(testServer, accessToken);

		const response = await duplicateRequest(source.shortCode, accessToken2);
		expect(response).toHaveStatusCode(403);
	});

	it('should carry over tags to the duplicated short URL', async () => {
		const tagResponse = await testServer.inject({
			method: 'POST',
			url: TAG_API_PATH,
			headers: { Authorization: `Bearer ${accessToken}` },
			payload: { name: `DupShortTag ${Date.now()}`, color: '#33FF99' },
		});
		expect(tagResponse).toHaveStatusCode(201);
		const tag = JSON.parse(tagResponse.payload) as { id: string; name: string };

		const source = await createShortUrl(testServer, accessToken);

		const assignResponse = await testServer.inject({
			method: 'PUT',
			url: `${TAG_API_PATH}/short-url/${source.id}`,
			headers: { Authorization: `Bearer ${accessToken}` },
			payload: { tagIds: [tag.id] },
		});
		expect(assignResponse).toHaveStatusCode(200);

		const response = await duplicateRequest(source.shortCode, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(duplicate.tags.map((t) => t.id)).toEqual([tag.id]);
	});

	it('should increment counter when duplicating an already-copied short URL', async () => {
		const source = await createShortUrl(testServer, accessToken, { name: 'My Link' });

		const firstResponse = await duplicateRequest(source.shortCode, accessToken);
		expect(firstResponse).toHaveStatusCode(201);
		const firstCopy = JSON.parse(firstResponse.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(firstCopy.name).toBe('(Copy) My Link');

		const secondResponse = await duplicateRequest(firstCopy.shortCode, accessToken);
		expect(secondResponse).toHaveStatusCode(201);
		const secondCopy = JSON.parse(secondResponse.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(secondCopy.name).toBe('(Copy 2) My Link');
	});
});
