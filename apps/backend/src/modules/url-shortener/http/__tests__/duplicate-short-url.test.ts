import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH, createShortUrl } from './utils';

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
});
