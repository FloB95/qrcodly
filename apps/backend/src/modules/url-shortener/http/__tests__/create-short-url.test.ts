import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { generateShortUrlDto } from '@/tests/shared/factories/short-url.factory';
import type { FastifyInstance } from 'fastify';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { SHORT_URL_API_PATH } from './utils';

describe('createShortUrl', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let userId: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		userId = ctx.user.id;
	});

	const createShortUrlRequest = async (payload: object, token: string) =>
		testServer.inject({
			method: 'POST',
			url: SHORT_URL_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			payload,
		});

	it('should create a standalone short URL and return 201', async () => {
		const dto = generateShortUrlDto();
		const response = await createShortUrlRequest(dto, accessToken);
		expect(response).toHaveStatusCode(201);

		const shortUrl = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(shortUrl.id).toEqual(expect.any(String));
		expect(shortUrl.shortCode).toHaveLength(5);
		expect(shortUrl.createdBy).toBe(userId);
		expect(shortUrl.destinationUrl).toBe(dto.destinationUrl);
		expect(shortUrl.isActive).toBe(true);
		expect(shortUrl.qrCodeId).toBeNull();
		expect(shortUrl.tags).toEqual([]);
	});

	it('should generate a 5-character lowercase alphanumeric short code', async () => {
		const dto = generateShortUrlDto();
		const response = await createShortUrlRequest(dto, accessToken);
		const shortUrl = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;

		expect(shortUrl.shortCode).toHaveLength(5);
		expect(shortUrl.shortCode).toMatch(/^[a-z0-9]{5}$/);
	});

	it('should allow creating a short URL with isActive set to false', async () => {
		const dto = generateShortUrlDto({ isActive: false });
		const response = await createShortUrlRequest(dto, accessToken);
		expect(response).toHaveStatusCode(201);

		const shortUrl = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(shortUrl.isActive).toBe(false);
	});

	it('should default isActive to true when not provided', async () => {
		const { isActive: _, ...dto } = generateShortUrlDto();
		const response = await createShortUrlRequest(dto, accessToken);
		expect(response).toHaveStatusCode(201);

		const shortUrl = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(shortUrl.isActive).toBe(true);
	});

	it('should create a short URL with a name', async () => {
		const dto = generateShortUrlDto({ name: 'My Campaign Link' });
		const response = await createShortUrlRequest(dto, accessToken);
		expect(response).toHaveStatusCode(201);

		const shortUrl = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(shortUrl.name).toBe('My Campaign Link');
	});

	it('should create a short URL without a name (null)', async () => {
		const dto = generateShortUrlDto({ name: null });
		const response = await createShortUrlRequest(dto, accessToken);
		expect(response).toHaveStatusCode(201);

		const shortUrl = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
		expect(shortUrl.name).toBeNull();
	});

	it('should return 401 when not authenticated', async () => {
		const response = await testServer.inject({
			method: 'POST',
			url: SHORT_URL_API_PATH,
			headers: { 'Content-Type': 'application/json' },
			payload: generateShortUrlDto(),
		});
		expect(response).toHaveStatusCode(401);
	});

	it('should return 400 for invalid destinationUrl format', async () => {
		const response = await createShortUrlRequest(
			{ destinationUrl: 'not-a-valid-url', isActive: true, customDomainId: null },
			accessToken,
		);
		expect(response).toHaveStatusCode(400);
	});

	it('should return 400 when destinationUrl is missing', async () => {
		const response = await createShortUrlRequest(
			{ isActive: true, customDomainId: null },
			accessToken,
		);
		expect(response).toHaveStatusCode(400);
	});

	it('should return 400 when destinationUrl is null', async () => {
		const response = await createShortUrlRequest(
			{ destinationUrl: null, isActive: true, customDomainId: null },
			accessToken,
		);
		expect(response).toHaveStatusCode(400);
	});
});
