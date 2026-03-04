import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { type User } from '@clerk/fastify';
import { CreateQrCodeUseCase } from '../../useCase/create-qr-code.use-case';
import {
	generateQrCodeDto,
	generateTextQrCodeDto,
	generateWifiQrCodeDto,
	generateVCardQrCodeDto,
} from './utils';
import { PlanName } from '@/core/config/plan.config';
import qs from 'qs';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;
const TAG_API_PATH = `${API_BASE_PATH}/tag`;

/**
 * List QR Codes API Tests
 */
describe('listQrCodes', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let user: User;
	let user2: User;

	const listQrCodesRequest = async (queryParams: Record<string, any> = {}, token?: string) =>
		testServer.inject({
			method: 'GET',
			url: `${QR_CODE_API_PATH}?${qs.stringify(queryParams)}`,
			headers: {
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		user = ctx.user;
		user2 = ctx.user2;

		const createUseCase = container.resolve(CreateQrCodeUseCase);
		const userContext = {
			id: user.id,
			plan: PlanName.FREE,
			tokenType: 'session_token' as const,
		};

		// Create URL QR codes for user1 with specific names
		await createUseCase.execute({ ...generateQrCodeDto(), name: 'My Website Link' }, userContext);
		await createUseCase.execute({ ...generateQrCodeDto(), name: 'Landing Page URL' }, userContext);

		// Create text QR code for user1
		await createUseCase.execute(
			{ ...generateTextQrCodeDto(), name: 'Welcome Message' },
			userContext,
		);

		// Create wifi QR code for user1
		await createUseCase.execute({ ...generateWifiQrCodeDto(), name: 'Office WiFi' }, userContext);

		// Create vCard QR code for user1
		await createUseCase.execute(
			{ ...generateVCardQrCodeDto(), name: 'Business Card' },
			userContext,
		);

		// Create QR codes for user2
		for (let i = 0; i < 2; i++) {
			const createQrCodeDto = generateQrCodeDto();
			await createUseCase.execute(createQrCodeDto, {
				id: user2.id,
				plan: PlanName.FREE,
				tokenType: 'session_token',
			});
		}
	});

	it('should fetch only the signed-in user\u2019s QR codes and return status code 200', async () => {
		const response = await listQrCodesRequest({}, accessToken);

		expect(response.statusCode).toBe(200);

		const { data, total, page, limit } = JSON.parse(response.payload);
		expect(Array.isArray(data)).toBe(true);
		expect(total).toBe(5); // User1 has 5 QR codes
		expect(page).toBe(1); // Default page
		expect(limit).toBe(10); // Default limit
		data.forEach((qrCode: any) => {
			expect(qrCode.createdBy).toBe(user.id);
		});
	});

	it('should respect pagination parameters', async () => {
		const response = await listQrCodesRequest({ page: 1, limit: 2 }, accessToken);

		expect(response.statusCode).toBe(200);

		const { data, total, page, limit } = JSON.parse(response.payload);
		expect(data.length).toBe(2); // Limit is 2
		expect(total).toBe(5); // User1 has 5 QR codes
		expect(page).toBe(1);
		expect(limit).toBe(2);
	});

	it('ensure the list works without page and limit parameters', async () => {
		const response = await listQrCodesRequest({}, accessToken2);

		expect(response.statusCode).toBe(200);

		const { data, total } = JSON.parse(response.payload);
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBe(2); // User2 has 2 QR codes
		expect(total).toBe(2);
		data.forEach((qrCode: any) => {
			expect(qrCode.createdBy).toBe(user2.id);
		});
	});

	it('should return 401 if no authorization token is provided', async () => {
		const response = await listQrCodesRequest();

		expect(response.statusCode).toBe(401);

		const { message } = JSON.parse(response.payload);
		expect(message).toBeDefined();
	});

	describe('name search filter', () => {
		it('should filter QR codes by name using like', async () => {
			const response = await listQrCodesRequest({ where: { name: { like: 'WiFi' } } }, accessToken);

			expect(response.statusCode).toBe(200);

			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(1);
			expect(data).toHaveLength(1);
			expect(data[0].name).toBe('Office WiFi');
		});

		it('should return multiple results for partial name match', async () => {
			const response = await listQrCodesRequest({ where: { name: { like: 'a' } } }, accessToken);

			expect(response.statusCode).toBe(200);

			const { data, total } = JSON.parse(response.payload);
			// 'My Website Link' does not contain 'a' but 'Landing Page URL', 'Welcome Message', 'Business Card' do
			expect(total).toBeGreaterThanOrEqual(1);
			data.forEach((qr: any) => {
				expect(qr.name.toLowerCase()).toContain('a');
			});
		});

		it('should return empty results for non-matching name', async () => {
			const response = await listQrCodesRequest(
				{ where: { name: { like: 'nonexistent_xyz_123' } } },
				accessToken,
			);

			expect(response.statusCode).toBe(200);

			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(0);
			expect(data).toHaveLength(0);
		});
	});

	describe('contentType filter', () => {
		it('should filter by single content type', async () => {
			const response = await listQrCodesRequest({ contentType: ['text'] }, accessToken);

			expect(response.statusCode).toBe(200);

			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(1);
			expect(data).toHaveLength(1);
			expect(data[0].content.type).toBe('text');
			expect(data[0].name).toBe('Welcome Message');
		});

		it('should filter by multiple content types', async () => {
			const response = await listQrCodesRequest({ contentType: ['url', 'wifi'] }, accessToken);

			expect(response.statusCode).toBe(200);

			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(3); // 2 URL + 1 WiFi
			expect(data).toHaveLength(3);
			data.forEach((qr: any) => {
				expect(['url', 'wifi']).toContain(qr.content.type);
			});
		});

		it('should return empty results for content type with no matches', async () => {
			const response = await listQrCodesRequest({ contentType: ['event'] }, accessToken);

			expect(response.statusCode).toBe(200);

			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(0);
			expect(data).toHaveLength(0);
		});

		it('should accept a single content type as string', async () => {
			const response = await listQrCodesRequest({ contentType: 'vCard' }, accessToken);

			expect(response.statusCode).toBe(200);

			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(1);
			expect(data[0].content.type).toBe('vCard');
		});
	});

	describe('combined filters', () => {
		it('should combine name search with contentType filter', async () => {
			const response = await listQrCodesRequest(
				{
					contentType: ['url'],
					where: { name: { like: 'Website' } },
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);

			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(1);
			expect(data).toHaveLength(1);
			expect(data[0].name).toBe('My Website Link');
			expect(data[0].content.type).toBe('url');
		});

		it('should combine contentType with pagination', async () => {
			const response = await listQrCodesRequest(
				{
					contentType: ['url'],
					page: 1,
					limit: 1,
				},
				accessToken,
			);

			expect(response.statusCode).toBe(200);

			const { data, total, limit } = JSON.parse(response.payload);
			expect(data).toHaveLength(1);
			expect(total).toBe(2); // 2 URL QR codes total
			expect(limit).toBe(1);
		});
	});

	describe('tagIds filter', () => {
		it('should filter QR codes by tag ID', async () => {
			// Create a tag
			const tagResponse = await testServer.inject({
				method: 'POST',
				url: TAG_API_PATH,
				headers: { Authorization: `Bearer ${accessToken}` },
				payload: { name: 'FilterTag ' + Date.now(), color: '#FF5733' },
			});
			expect(tagResponse.statusCode).toBe(201);
			const tag = JSON.parse(tagResponse.payload);

			// Create a QR code and assign the tag
			const createUseCase = container.resolve(CreateQrCodeUseCase);
			const qr = await createUseCase.execute(
				{ ...generateTextQrCodeDto(), name: 'Tagged QR ' + Date.now() },
				{ id: user.id, plan: PlanName.FREE, tokenType: 'session_token' },
			);

			await testServer.inject({
				method: 'PUT',
				url: `${TAG_API_PATH}/qr-code/${qr.id}`,
				headers: { Authorization: `Bearer ${accessToken}` },
				payload: { tagIds: [tag.id] },
			});

			// Filter by tagIds
			const response = await listQrCodesRequest({ tagIds: [tag.id] }, accessToken);

			expect(response.statusCode).toBe(200);
			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(1);
			expect(data).toHaveLength(1);
			expect(data[0].id).toBe(qr.id);
		});

		it('should return empty results for tag with no QR codes', async () => {
			const tagResponse = await testServer.inject({
				method: 'POST',
				url: TAG_API_PATH,
				headers: { Authorization: `Bearer ${accessToken}` },
				payload: { name: 'EmptyTag ' + Date.now(), color: '#00FF00' },
			});
			expect(tagResponse.statusCode).toBe(201);
			const tag = JSON.parse(tagResponse.payload);

			const response = await listQrCodesRequest({ tagIds: [tag.id] }, accessToken);

			expect(response.statusCode).toBe(200);
			const { data, total } = JSON.parse(response.payload);
			expect(total).toBe(0);
			expect(data).toHaveLength(0);
		});
	});
});
