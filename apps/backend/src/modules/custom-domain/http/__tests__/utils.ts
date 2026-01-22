import { API_BASE_PATH } from '@/core/config/constants';
import {
	getTestContext as getGlobalTestContext,
	TEST_USER_PRO_ID,
	TEST_USER_2_ID,
} from '@/tests/shared/test-context';
import { generateCreateCustomDomainDto } from '@/tests/shared/factories/custom-domain.factory';
import type { FastifyInstance } from 'fastify';
import type { TCustomDomainResponseDto, TCreateCustomDomainDto } from '@shared/schemas';
import db from '@/core/db';
import { customDomain } from '@/core/db/schemas';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { TCustomDomain } from '@/modules/custom-domain/domain/entities/custom-domain.entity';

export const CUSTOM_DOMAIN_API_PATH = `${API_BASE_PATH}/custom-domain`;

// Re-export for convenience in tests
export { TEST_USER_PRO_ID, TEST_USER_2_ID };

export interface TestContext {
	testServer: FastifyInstance;
	accessToken: string;
	accessToken2: string;
	accessTokenPro: string;
	createdDomainIds: string[];
}

const contextCreatedDomainIds: string[] = [];

/**
 * Gets the shared test context.
 * The context is managed globally by test-context.ts.
 */
export const getTestContext = async (): Promise<TestContext> => {
	const ctx = await getGlobalTestContext();

	// Clean up any existing domains from previous test runs on first call
	if (contextCreatedDomainIds.length === 0) {
		await cleanupDomainsForUser(TEST_USER_PRO_ID);
		await cleanupDomainsForUser(TEST_USER_2_ID);
	}

	return {
		testServer: ctx.testServer,
		accessToken: ctx.accessToken,
		accessToken2: ctx.accessToken2,
		accessTokenPro: ctx.accessTokenPro,
		createdDomainIds: contextCreatedDomainIds,
	};
};

/**
 * Helper to directly create a custom domain in the database.
 * This bypasses the API policy check which requires Pro plan.
 * Used for tests that need a domain to exist to test other functionality.
 */
export const createCustomDomainDirectly = async (
	context: TestContext,
	domain: string,
	createdByUserId: string,
	options: {
		sslStatus?: TCustomDomain['sslStatus'];
		ownershipStatus?: TCustomDomain['ownershipStatus'];
		isDefault?: boolean;
		isEnabled?: boolean;
		verificationPhase?: TCustomDomain['verificationPhase'];
		ownershipTxtVerified?: boolean;
		cnameVerified?: boolean;
	} = {},
): Promise<string> => {
	const id = randomUUID();
	const now = new Date();
	const subdomain = domain.split('.').slice(0, -2).join('.');

	await db.insert(customDomain).values({
		id,
		domain: domain.toLowerCase(),
		sslStatus: options.sslStatus ?? 'initializing',
		ownershipStatus: options.ownershipStatus ?? 'pending',
		isDefault: options.isDefault ?? false,
		verificationPhase: options.verificationPhase ?? 'dns_verification',
		ownershipTxtVerified: options.ownershipTxtVerified ?? false,
		cnameVerified: options.cnameVerified ?? false,
		isEnabled: options.isEnabled ?? true,
		cloudflareHostnameId: null,
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		ownershipValidationTxtName: `_qrcodly-verify.${subdomain}`,
		ownershipValidationTxtValue: `qrcodly-verify-${id}`,
		validationErrors: null,
		createdBy: createdByUserId,
		createdAt: now,
		updatedAt: now,
	});

	context.createdDomainIds.push(id);
	return id;
};

/**
 * Helper to delete a custom domain from the database.
 */
export const deleteCustomDomainDirectly = async (domainId: string) => {
	await db.delete(customDomain).where(eq(customDomain.id, domainId));
};

/**
 * Clean up all domains for a user.
 */
export const cleanupDomainsForUser = async (userIdToCleanup: string) => {
	await db.delete(customDomain).where(eq(customDomain.createdBy, userIdToCleanup));
};

/**
 * Clean up created domains after each test.
 */
export const cleanupCreatedDomains = async (context: TestContext) => {
	for (const id of context.createdDomainIds) {
		try {
			await deleteCustomDomainDirectly(id);
		} catch {
			// Ignore if already deleted
		}
	}
	context.createdDomainIds.length = 0;
};

// API helper functions

export const createCustomDomainViaApi = async (
	context: TestContext,
	dto: TCreateCustomDomainDto,
	token: string,
) => {
	const response = await context.testServer.inject({
		method: 'POST',
		url: CUSTOM_DOMAIN_API_PATH,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		payload: dto,
	});
	// Track created domain for cleanup
	if (response.statusCode === 201) {
		const created = JSON.parse(response.payload) as TCustomDomainResponseDto;
		context.createdDomainIds.push(created.id);
	}
	return response;
};

export const getCustomDomain = async (context: TestContext, id: string, token: string) =>
	context.testServer.inject({
		method: 'GET',
		url: `${CUSTOM_DOMAIN_API_PATH}/${id}`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const listCustomDomains = async (context: TestContext, token: string, query?: string) =>
	context.testServer.inject({
		method: 'GET',
		url: `${CUSTOM_DOMAIN_API_PATH}${query ? `?${query}` : ''}`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const verifyCustomDomain = async (context: TestContext, id: string, token: string) =>
	context.testServer.inject({
		method: 'POST',
		url: `${CUSTOM_DOMAIN_API_PATH}/${id}/verify`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const deleteCustomDomainViaApi = async (context: TestContext, id: string, token: string) =>
	context.testServer.inject({
		method: 'DELETE',
		url: `${CUSTOM_DOMAIN_API_PATH}/${id}`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const getSetupInstructions = async (context: TestContext, id: string, token: string) =>
	context.testServer.inject({
		method: 'GET',
		url: `${CUSTOM_DOMAIN_API_PATH}/${id}/setup-instructions`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const setDefaultDomain = async (context: TestContext, id: string, token: string) =>
	context.testServer.inject({
		method: 'POST',
		url: `${CUSTOM_DOMAIN_API_PATH}/${id}/set-default`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const getDefaultDomain = async (context: TestContext, token: string) =>
	context.testServer.inject({
		method: 'GET',
		url: `${CUSTOM_DOMAIN_API_PATH}/default`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const clearDefaultDomain = async (context: TestContext, token: string) =>
	context.testServer.inject({
		method: 'POST',
		url: `${CUSTOM_DOMAIN_API_PATH}/clear-default`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const resolveDomain = async (context: TestContext, domain: string) =>
	context.testServer.inject({
		method: 'GET',
		url: `${CUSTOM_DOMAIN_API_PATH}/resolve?domain=${encodeURIComponent(domain)}`,
	});

// Re-export factory for convenience
export { generateCreateCustomDomainDto };
