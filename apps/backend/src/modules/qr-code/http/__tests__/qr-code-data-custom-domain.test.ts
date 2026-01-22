import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	generateEditableUrlQrCodeDto,
	generateEventQrCodeDto,
	generateDynamicVCardQrCodeDto,
	getTestContext,
	createQrCodeRequest,
} from './utils';
import { generateCreateCustomDomainDto } from '@/tests/shared/factories/custom-domain.factory';
import {
	createCustomDomainDirectly,
	deleteCustomDomainDirectly,
	setDefaultDomain,
	TEST_USER_PRO_ID,
	type TestContext,
} from '@/modules/custom-domain/http/__tests__/utils';
import db from '@/core/db';
import { customDomain } from '@/core/db/schemas';
import { eq, and } from 'drizzle-orm';

describe('QR Code Data - Custom Domain Integration', () => {
	let testServer: FastifyInstance;
	let accessTokenPro: string;
	let ctx: TestContext;

	beforeAll(async () => {
		const qrCtx = await getTestContext();
		testServer = qrCtx.testServer;
		accessTokenPro = qrCtx.accessTokenPro;

		// Get custom domain context for cleanup tracking
		const { getTestContext: getCustomDomainContext } =
			await import('@/modules/custom-domain/http/__tests__/utils');
		ctx = await getCustomDomainContext();
	});

	/**
	 * Helper to clear default domain for a user without deleting domains.
	 */
	const clearDefaultDomainForUser = async (userId: string) => {
		await db
			.update(customDomain)
			.set({ isDefault: false })
			.where(and(eq(customDomain.createdBy, userId), eq(customDomain.isDefault, true)));
	};

	describe('Dynamic QR codes with custom domain', () => {
		let testDomainId: string;
		let testDomainName: string;

		beforeAll(async () => {
			// Create a fully verified custom domain directly in DB
			const dto = generateCreateCustomDomainDto();
			testDomainName = dto.domain.toLowerCase();

			testDomainId = await createCustomDomainDirectly(ctx, testDomainName, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				isDefault: true,
				isEnabled: true,
				cnameVerified: true,
				ownershipTxtVerified: true,
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
		it('should reject setting unverified domain as default', async () => {
			// Create an unverified domain directly in DB (initializing SSL)
			const dto = generateCreateCustomDomainDto();
			const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'initializing',
				ownershipStatus: 'pending',
				cnameVerified: false,
				ownershipTxtVerified: false,
			});

			// Attempt to set as default without being fully verified
			const setDefaultResponse = await setDefaultDomain(ctx, domainId, accessTokenPro);
			expect(setDefaultResponse.statusCode).toBe(400);

			const error = JSON.parse(setDefaultResponse.payload);
			expect(error.message).toContain('not valid for use');

			// Cleanup
			await deleteCustomDomainDirectly(domainId);
		});

		it('should reject setting domain with pending_validation SSL as default', async () => {
			// Create a domain with pending SSL validation
			const dto = generateCreateCustomDomainDto();
			const domainId = await createCustomDomainDirectly(ctx, dto.domain, TEST_USER_PRO_ID, {
				sslStatus: 'pending_validation',
				ownershipStatus: 'pending',
				cnameVerified: false,
				ownershipTxtVerified: false,
			});

			// Attempt to set as default
			const setDefaultResponse = await setDefaultDomain(ctx, domainId, accessTokenPro);
			expect(setDefaultResponse.statusCode).toBe(400);

			const error = JSON.parse(setDefaultResponse.payload);
			expect(error.message).toContain('not valid for use');

			// Cleanup
			await deleteCustomDomainDirectly(domainId);
		});
	});
});
