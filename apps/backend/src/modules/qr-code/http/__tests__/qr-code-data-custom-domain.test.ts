import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { API_BASE_PATH } from '@/core/config/constants';
import {
	generateEditableUrlQrCodeDto,
	generateEventQrCodeDto,
	generateDynamicVCardQrCodeDto,
	getTestContext,
	releaseTestContext,
	createQrCodeRequest,
} from './utils';
import { generateCreateCustomDomainDto } from '@/tests/shared/factories/custom-domain.factory';
import db from '@/core/db';
import { customDomain } from '@/core/db/schemas';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { TCustomDomain } from '@/modules/custom-domain/domain/entities/custom-domain.entity';

const CUSTOM_DOMAIN_API_PATH = `${API_BASE_PATH}/custom-domain`;

// Pro user ID from test-server.ts
const TEST_USER_PRO_ID = 'user_2vxx4UoYRjT2mi1I4FMFEbpzbAA';

describe('QR Code Data - Custom Domain Integration', () => {
	let testServer: FastifyInstance;
	let accessTokenPro: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessTokenPro = ctx.accessTokenPro;
	});

	afterAll(async () => {
		await releaseTestContext();
	});

	/**
	 * Helper to directly create a custom domain in the database.
	 * This bypasses the API policy check which requires Pro plan.
	 * In tests we need to verify qrCodeData behavior, not plan restrictions.
	 */
	const createCustomDomainDirectly = async (
		domain: string,
		userId: string,
		options: { sslStatus?: TCustomDomain['sslStatus']; isDefault?: boolean } = {},
	): Promise<string> => {
		const id = randomUUID();
		const now = new Date();

		await db.insert(customDomain).values({
			id,
			domain: domain.toLowerCase(),
			sslStatus: options.sslStatus ?? 'initializing',
			ownershipStatus: options.sslStatus === 'active' ? 'verified' : 'pending',
			isDefault: options.isDefault ?? false,
			cloudflareHostnameId: null,
			sslValidationTxtName: null,
			sslValidationTxtValue: null,
			ownershipValidationTxtName: null,
			ownershipValidationTxtValue: null,
			createdBy: userId,
			createdAt: now,
			updatedAt: now,
		});

		return id;
	};

	/**
	 * Helper to set a domain as the default for a user.
	 * First clears any existing default, then sets the new one.
	 */
	const setDomainAsDefault = async (domainId: string, userId: string) => {
		// Clear any existing default for this user
		await db
			.update(customDomain)
			.set({ isDefault: false })
			.where(and(eq(customDomain.createdBy, userId), eq(customDomain.isDefault, true)));

		// Set this domain as default
		await db.update(customDomain).set({ isDefault: true }).where(eq(customDomain.id, domainId));
	};

	/**
	 * Helper to clear default domain for a user.
	 */
	const clearDefaultDomainForUser = async (userId: string) => {
		await db
			.update(customDomain)
			.set({ isDefault: false })
			.where(and(eq(customDomain.createdBy, userId), eq(customDomain.isDefault, true)));
	};

	/**
	 * Helper to delete a custom domain from the database.
	 */
	const deleteCustomDomainDirectly = async (domainId: string) => {
		await db.delete(customDomain).where(eq(customDomain.id, domainId));
	};

	describe('Dynamic QR codes with custom domain', () => {
		let testDomainId: string;
		let testDomainName: string;

		beforeAll(async () => {
			// Create a fully verified custom domain directly in DB
			const dto = generateCreateCustomDomainDto();
			testDomainName = dto.domain.toLowerCase();

			testDomainId = await createCustomDomainDirectly(testDomainName, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				isDefault: true,
			});
		});

		afterAll(async () => {
			// Cleanup
			await deleteCustomDomainDirectly(testDomainId);
		});

		it('should use custom domain in qrCodeData for editable URL QR code', async () => {
			const createQrCodeDto = generateEditableUrlQrCodeDto();
			const response = await createQrCodeRequest(testServer, createQrCodeDto, accessTokenPro);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			// Verify qrCodeData uses custom domain
			expect(receivedQrCode.qrCodeData).toContain(`https://${testDomainName}/u/`);
			expect(receivedQrCode.qrCodeData).toContain(receivedQrCode.shortUrl?.shortCode);
		});

		it('should use custom domain in qrCodeData for event QR code', async () => {
			const createQrCodeDto = generateEventQrCodeDto();
			const response = await createQrCodeRequest(testServer, createQrCodeDto, accessTokenPro);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			// Verify qrCodeData uses custom domain
			expect(receivedQrCode.qrCodeData).toContain(`https://${testDomainName}/u/`);
			expect(receivedQrCode.qrCodeData).toContain(receivedQrCode.shortUrl?.shortCode);
		});

		it('should use custom domain in qrCodeData for dynamic vCard QR code', async () => {
			const createQrCodeDto = generateDynamicVCardQrCodeDto();
			const response = await createQrCodeRequest(testServer, createQrCodeDto, accessTokenPro);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			// Verify qrCodeData uses custom domain
			expect(receivedQrCode.qrCodeData).toContain(`https://${testDomainName}/u/`);
			expect(receivedQrCode.qrCodeData).toContain(receivedQrCode.shortUrl?.shortCode);
		});
	});

	describe('Dynamic QR codes without custom domain (uses FRONTEND_URL)', () => {
		beforeAll(async () => {
			// Ensure no default domain is set for Pro user
			await clearDefaultDomainForUser(TEST_USER_PRO_ID);
		});

		it('should use FRONTEND_URL in qrCodeData for editable URL QR code when no custom domain', async () => {
			const createQrCodeDto = generateEditableUrlQrCodeDto();
			const response = await createQrCodeRequest(testServer, createQrCodeDto, accessTokenPro);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			// Verify qrCodeData does NOT use custom domain pattern (https://something.example.com)
			// It should use FRONTEND_URL (typically localhost:3000 in test environment)
			expect(receivedQrCode.qrCodeData).toContain('/u/');
			expect(receivedQrCode.qrCodeData).toContain(receivedQrCode.shortUrl?.shortCode);
			// Should not contain example.com (custom domain pattern)
			expect(receivedQrCode.qrCodeData).not.toContain('.example.com');
		});

		it('should use FRONTEND_URL in qrCodeData for event QR code when no custom domain', async () => {
			const createQrCodeDto = generateEventQrCodeDto();
			const response = await createQrCodeRequest(testServer, createQrCodeDto, accessTokenPro);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			// Verify qrCodeData uses FRONTEND_URL pattern
			expect(receivedQrCode.qrCodeData).toContain('/u/');
			expect(receivedQrCode.qrCodeData).toContain(receivedQrCode.shortUrl?.shortCode);
			expect(receivedQrCode.qrCodeData).not.toContain('.example.com');
		});

		it('should use FRONTEND_URL in qrCodeData for dynamic vCard when no custom domain', async () => {
			const createQrCodeDto = generateDynamicVCardQrCodeDto();
			const response = await createQrCodeRequest(testServer, createQrCodeDto, accessTokenPro);
			expect(response.statusCode).toBe(201);

			const receivedQrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			// Verify qrCodeData uses FRONTEND_URL pattern
			expect(receivedQrCode.qrCodeData).toContain('/u/');
			expect(receivedQrCode.qrCodeData).toContain(receivedQrCode.shortUrl?.shortCode);
			expect(receivedQrCode.qrCodeData).not.toContain('.example.com');
		});
	});

	describe('Custom domain validation for qrCodeData', () => {
		// Helper to call set-default API
		const setDefaultDomain = async (id: string, token: string) =>
			testServer.inject({
				method: 'POST',
				url: `${CUSTOM_DOMAIN_API_PATH}/${id}/set-default`,
				headers: { Authorization: `Bearer ${token}` },
			});

		it('should reject setting unverified domain as default', async () => {
			// Create an unverified domain directly in DB (initializing SSL)
			const dto = generateCreateCustomDomainDto();
			const domainId = await createCustomDomainDirectly(dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'initializing',
			});

			// Attempt to set as default without SSL being active
			const setDefaultResponse = await setDefaultDomain(domainId, accessTokenPro);
			expect(setDefaultResponse.statusCode).toBe(400);

			const error = JSON.parse(setDefaultResponse.payload);
			expect(error.message).toContain('SSL');

			// Cleanup
			await deleteCustomDomainDirectly(domainId);
		});

		it('should reject setting domain with pending_validation SSL as default', async () => {
			// Create a domain with pending SSL validation
			const dto = generateCreateCustomDomainDto();
			const domainId = await createCustomDomainDirectly(dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'pending_validation',
			});

			// Attempt to set as default
			const setDefaultResponse = await setDefaultDomain(domainId, accessTokenPro);
			expect(setDefaultResponse.statusCode).toBe(400);

			const error = JSON.parse(setDefaultResponse.payload);
			expect(error.message).toContain('SSL');

			// Cleanup
			await deleteCustomDomainDirectly(domainId);
		});
	});
});
