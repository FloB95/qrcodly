import { API_BASE_PATH } from '@/core/config/constants';
import { getTestServerWithUserAuth, shutDownServer } from '@/tests/shared/test-server';
import { generateCreateCustomDomainDto } from '@/tests/shared/factories/custom-domain.factory';
import type { FastifyInstance } from 'fastify';
import type {
	TCustomDomainResponseDto,
	TCustomDomainListResponseDto,
	TCreateCustomDomainDto,
} from '@shared/schemas';

const CUSTOM_DOMAIN_API_PATH = `${API_BASE_PATH}/custom-domain`;

describe('CustomDomainController', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let userId: string;

	beforeAll(async () => {
		const serverSetup = await getTestServerWithUserAuth();
		testServer = serverSetup.testServer;
		accessToken = serverSetup.accessToken;
		accessToken2 = serverSetup.accessToken2;
		userId = serverSetup.user.id;
	});

	afterAll(async () => {
		await shutDownServer();
	});

	// Helper functions
	const createCustomDomain = async (dto: TCreateCustomDomainDto, token: string) =>
		testServer.inject({
			method: 'POST',
			url: CUSTOM_DOMAIN_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			payload: dto,
		});

	const getCustomDomain = async (id: string, token: string) =>
		testServer.inject({
			method: 'GET',
			url: `${CUSTOM_DOMAIN_API_PATH}/${id}`,
			headers: { Authorization: `Bearer ${token}` },
		});

	const listCustomDomains = async (token: string, query?: string) =>
		testServer.inject({
			method: 'GET',
			url: `${CUSTOM_DOMAIN_API_PATH}${query ? `?${query}` : ''}`,
			headers: { Authorization: `Bearer ${token}` },
		});

	const verifyCustomDomain = async (id: string, token: string) =>
		testServer.inject({
			method: 'POST',
			url: `${CUSTOM_DOMAIN_API_PATH}/${id}/verify`,
			headers: { Authorization: `Bearer ${token}` },
		});

	const deleteCustomDomain = async (id: string, token: string) =>
		testServer.inject({
			method: 'DELETE',
			url: `${CUSTOM_DOMAIN_API_PATH}/${id}`,
			headers: { Authorization: `Bearer ${token}` },
		});

	const getVerificationInstructions = async (id: string, token: string) =>
		testServer.inject({
			method: 'GET',
			url: `${CUSTOM_DOMAIN_API_PATH}/${id}/verification-instructions`,
			headers: { Authorization: `Bearer ${token}` },
		});

	describe('POST / (Create Custom Domain)', () => {
		it('should create a custom domain and return 201', async () => {
			const dto = generateCreateCustomDomainDto();
			const response = await createCustomDomain(dto, accessToken);

			expect(response.statusCode).toBe(201);

			const customDomain = JSON.parse(response.payload) as TCustomDomainResponseDto;
			expect(customDomain.domain).toBe(dto.domain.toLowerCase());
			expect(customDomain.isVerified).toBe(false);
			expect(customDomain.verificationToken).toHaveLength(64);
			expect(customDomain.createdBy).toBe(userId);
		});

		it('should return 400 for invalid domain format', async () => {
			const dto = { domain: 'invalid-domain' };
			const response = await createCustomDomain(dto, accessToken);

			expect(response.statusCode).toBe(400);
		});

		it('should return 400 for duplicate domain', async () => {
			const dto = generateCreateCustomDomainDto();

			// First creation should succeed
			const response1 = await createCustomDomain(dto, accessToken);
			expect(response1.statusCode).toBe(201);

			// Second creation with same domain should fail
			const response2 = await createCustomDomain(dto, accessToken);
			expect(response2.statusCode).toBe(400);
		});

		it('should return 401 when not authenticated', async () => {
			const dto = generateCreateCustomDomainDto();
			const response = await testServer.inject({
				method: 'POST',
				url: CUSTOM_DOMAIN_API_PATH,
				payload: dto,
			});

			expect(response.statusCode).toBe(401);
		});

		it('should normalize domain to lowercase', async () => {
			const dto = { domain: 'TEST.EXAMPLE.COM' };
			const response = await createCustomDomain(dto, accessToken);

			expect(response.statusCode).toBe(201);

			const customDomain = JSON.parse(response.payload) as TCustomDomainResponseDto;
			expect(customDomain.domain).toBe('test.example.com');
		});
	});

	describe('GET / (List Custom Domains)', () => {
		it('should list custom domains for authenticated user', async () => {
			// Create a domain first
			const dto = generateCreateCustomDomainDto();
			await createCustomDomain(dto, accessToken);

			const response = await listCustomDomains(accessToken);
			expect(response.statusCode).toBe(200);

			const result = JSON.parse(response.payload) as TCustomDomainListResponseDto;
			expect(result.data).toBeInstanceOf(Array);
			expect(result.pagination).toBeDefined();
			expect(result.pagination.total).toBeGreaterThanOrEqual(1);
		});

		it('should support pagination', async () => {
			const response = await listCustomDomains(accessToken, 'page=1&limit=5');
			expect(response.statusCode).toBe(200);

			const result = JSON.parse(response.payload) as TCustomDomainListResponseDto;
			expect(result.pagination.page).toBe(1);
			expect(result.pagination.limit).toBe(5);
		});

		it('should return 401 when not authenticated', async () => {
			const response = await testServer.inject({
				method: 'GET',
				url: CUSTOM_DOMAIN_API_PATH,
			});

			expect(response.statusCode).toBe(401);
		});

		it('should only return domains owned by the user', async () => {
			// Create domain for user 1
			const dto1 = generateCreateCustomDomainDto();
			await createCustomDomain(dto1, accessToken);

			// Create domain for user 2
			const dto2 = generateCreateCustomDomainDto();
			await createCustomDomain(dto2, accessToken2);

			// List for user 1
			const response1 = await listCustomDomains(accessToken);
			const result1 = JSON.parse(response1.payload) as TCustomDomainListResponseDto;

			// List for user 2
			const response2 = await listCustomDomains(accessToken2);
			const result2 = JSON.parse(response2.payload) as TCustomDomainListResponseDto;

			// User 1's domain should not appear in user 2's list and vice versa
			const user1Domains = result1.data.map((d) => d.domain);
			const user2Domains = result2.data.map((d) => d.domain);

			expect(user1Domains).toContain(dto1.domain.toLowerCase());
			expect(user1Domains).not.toContain(dto2.domain.toLowerCase());
			expect(user2Domains).toContain(dto2.domain.toLowerCase());
			expect(user2Domains).not.toContain(dto1.domain.toLowerCase());
		});
	});

	describe('GET /:id (Get Custom Domain)', () => {
		it('should return custom domain by ID', async () => {
			const dto = generateCreateCustomDomainDto();
			const createResponse = await createCustomDomain(dto, accessToken);
			const created = JSON.parse(createResponse.payload) as TCustomDomainResponseDto;

			const response = await getCustomDomain(created.id, accessToken);
			expect(response.statusCode).toBe(200);

			const customDomain = JSON.parse(response.payload) as TCustomDomainResponseDto;
			expect(customDomain.id).toBe(created.id);
			expect(customDomain.domain).toBe(dto.domain.toLowerCase());
		});

		it("should return 403 when accessing another user's domain", async () => {
			const dto = generateCreateCustomDomainDto();
			const createResponse = await createCustomDomain(dto, accessToken);
			const created = JSON.parse(createResponse.payload) as TCustomDomainResponseDto;

			const response = await getCustomDomain(created.id, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 for non-existent domain', async () => {
			const response = await getCustomDomain('00000000-0000-0000-0000-000000000000', accessToken);
			expect(response.statusCode).toBe(404);
		});

		it('should return 401 when not authenticated', async () => {
			const response = await testServer.inject({
				method: 'GET',
				url: `${CUSTOM_DOMAIN_API_PATH}/some-id`,
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe('GET /:id/verification-instructions', () => {
		it('should return verification instructions', async () => {
			const dto = generateCreateCustomDomainDto();
			const createResponse = await createCustomDomain(dto, accessToken);
			const created = JSON.parse(createResponse.payload) as TCustomDomainResponseDto;

			const response = await getVerificationInstructions(created.id, accessToken);
			expect(response.statusCode).toBe(200);

			const instructions = JSON.parse(response.payload) as {
				recordType: string;
				recordHost: string;
				recordValue: string;
				instructions: string;
			};

			expect(instructions.recordType).toBe('TXT');
			expect(instructions.recordHost).toBe(`_qrcodly-verify.${dto.domain.toLowerCase()}`);
			expect(instructions.recordValue).toBe(`qrcodly-verify=${created.verificationToken}`);
			expect(instructions.instructions).toContain('TXT record');
		});

		it('should return 403 for another user\s domain', async () => {
			const dto = generateCreateCustomDomainDto();
			const createResponse = await createCustomDomain(dto, accessToken);
			const created = JSON.parse(createResponse.payload) as TCustomDomainResponseDto;

			const response = await getVerificationInstructions(created.id, accessToken2);
			expect(response.statusCode).toBe(403);
		});
	});

	describe('POST /:id/verify', () => {
		it('should return 400 when DNS record is not found', async () => {
			const dto = generateCreateCustomDomainDto();
			const createResponse = await createCustomDomain(dto, accessToken);
			const created = JSON.parse(createResponse.payload) as TCustomDomainResponseDto;

			// Attempting to verify without setting up DNS should fail
			const response = await verifyCustomDomain(created.id, accessToken);
			expect(response.statusCode).toBe(400);
		});

		it('should return 403 for another user\s domain', async () => {
			const dto = generateCreateCustomDomainDto();
			const createResponse = await createCustomDomain(dto, accessToken);
			const created = JSON.parse(createResponse.payload) as TCustomDomainResponseDto;

			const response = await verifyCustomDomain(created.id, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 for non-existent domain', async () => {
			const response = await verifyCustomDomain(
				'00000000-0000-0000-0000-000000000000',
				accessToken,
			);
			expect(response.statusCode).toBe(404);
		});
	});

	describe('DELETE /:id', () => {
		it('should delete custom domain and return 204', async () => {
			const dto = generateCreateCustomDomainDto();
			const createResponse = await createCustomDomain(dto, accessToken);
			const created = JSON.parse(createResponse.payload) as TCustomDomainResponseDto;

			const response = await deleteCustomDomain(created.id, accessToken);
			expect(response.statusCode).toBe(204);

			// Verify it's deleted
			const getResponse = await getCustomDomain(created.id, accessToken);
			expect(getResponse.statusCode).toBe(404);
		});

		it('should return 403 when deleting another user\s domain', async () => {
			const dto = generateCreateCustomDomainDto();
			const createResponse = await createCustomDomain(dto, accessToken);
			const created = JSON.parse(createResponse.payload) as TCustomDomainResponseDto;

			const response = await deleteCustomDomain(created.id, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 for non-existent domain', async () => {
			const response = await deleteCustomDomain(
				'00000000-0000-0000-0000-000000000000',
				accessToken,
			);
			expect(response.statusCode).toBe(404);
		});

		it('should return 401 when not authenticated', async () => {
			const response = await testServer.inject({
				method: 'DELETE',
				url: `${CUSTOM_DOMAIN_API_PATH}/some-id`,
			});

			expect(response.statusCode).toBe(401);
		});
	});
});
