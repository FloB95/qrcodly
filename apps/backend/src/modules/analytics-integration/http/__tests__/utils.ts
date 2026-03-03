import { API_BASE_PATH } from '@/core/config/constants';
import {
	getTestContext as getGlobalTestContext,
	TEST_USER_PRO_ID,
	TEST_USER_2_ID,
	TEST_USER_ID,
} from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import db from '@/core/db';
import analyticsIntegration from '../../domain/entities/analytics-integration.entity';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { TAnalyticsIntegration } from '../../domain/entities/analytics-integration.entity';
import type { TProviderType } from '../../domain/entities/analytics-integration.entity';
import { container } from 'tsyringe';
import { CredentialEncryptionService } from '../../service/credential-encryption.service';

export const ANALYTICS_INTEGRATION_API_PATH = `${API_BASE_PATH}/analytics-integration`;

// Re-export for convenience in tests
export { TEST_USER_PRO_ID, TEST_USER_2_ID, TEST_USER_ID };

export interface TestContext {
	testServer: FastifyInstance;
	accessToken: string;
	accessToken2: string;
	accessTokenPro: string;
	createdIntegrationIds: string[];
}

const contextCreatedIntegrationIds: string[] = [];

/**
 * Gets the shared test context.
 */
export const getTestContext = async (): Promise<TestContext> => {
	const ctx = await getGlobalTestContext();

	// Clean up any existing integrations from previous test runs on first call
	if (contextCreatedIntegrationIds.length === 0) {
		await cleanupIntegrationsForUser(TEST_USER_PRO_ID);
		await cleanupIntegrationsForUser(TEST_USER_2_ID);
		await cleanupIntegrationsForUser(TEST_USER_ID);
	}

	return {
		testServer: ctx.testServer,
		accessToken: ctx.accessToken,
		accessToken2: ctx.accessToken2,
		accessTokenPro: ctx.accessTokenPro,
		createdIntegrationIds: contextCreatedIntegrationIds,
	};
};

/**
 * Helper to directly create an analytics integration in the database.
 */
export const createIntegrationDirectly = async (
	context: TestContext,
	userId: string,
	options: {
		providerType?: TProviderType;
		isEnabled?: boolean;
		credentials?: Record<string, unknown>;
	} = {},
): Promise<string> => {
	const id = randomUUID();
	const now = new Date();
	const encryptionService = container.resolve(CredentialEncryptionService);

	const defaultCredentials =
		(options.providerType ?? 'google_analytics') === 'google_analytics'
			? { measurementId: 'G-TESTTEST01', apiSecret: 'test_secret_123' }
			: { matomoUrl: 'https://matomo.example.com', siteId: '1' };

	const { encrypted, iv, tag } = encryptionService.encrypt(
		options.credentials ?? defaultCredentials,
	);

	await db
		.insert(analyticsIntegration)
		.values({
			id,
			providerType: options.providerType ?? 'google_analytics',
			encryptedCredentials: encrypted,
			encryptionIv: iv,
			encryptionTag: tag,
			isEnabled: options.isEnabled ?? true,
			lastError: null,
			lastErrorAt: null,
			consecutiveFailures: 0,
			createdBy: userId,
			createdAt: now,
			updatedAt: null,
		})
		.execute();

	context.createdIntegrationIds.push(id);
	return id;
};

/**
 * Helper to delete an integration from the database.
 */
export const deleteIntegrationDirectly = async (integrationId: string) => {
	await db.delete(analyticsIntegration).where(eq(analyticsIntegration.id, integrationId)).execute();
};

/**
 * Clean up all integrations for a user.
 */
export const cleanupIntegrationsForUser = async (userIdToCleanup: string) => {
	await db
		.delete(analyticsIntegration)
		.where(eq(analyticsIntegration.createdBy, userIdToCleanup))
		.execute();
};

/**
 * Clean up created integrations after each test.
 */
export const cleanupCreatedIntegrations = async (context: TestContext) => {
	for (const id of context.createdIntegrationIds) {
		try {
			await deleteIntegrationDirectly(id);
		} catch {
			// Ignore if already deleted
		}
	}
	context.createdIntegrationIds.length = 0;
};

// API helper functions

export const listIntegrations = async (context: TestContext, token: string) =>
	context.testServer.inject({
		method: 'GET',
		url: ANALYTICS_INTEGRATION_API_PATH,
		headers: { Authorization: `Bearer ${token}` },
	});

export const createIntegrationViaApi = async (
	context: TestContext,
	payload: {
		providerType: TProviderType;
		credentials: Record<string, unknown>;
	},
	token: string,
) =>
	context.testServer.inject({
		method: 'POST',
		url: ANALYTICS_INTEGRATION_API_PATH,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		payload,
	});

export const updateIntegrationViaApi = async (
	context: TestContext,
	id: string,
	payload: Record<string, unknown>,
	token: string,
) =>
	context.testServer.inject({
		method: 'PATCH',
		url: `${ANALYTICS_INTEGRATION_API_PATH}/${id}`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		payload,
	});

export const deleteIntegrationViaApi = async (context: TestContext, id: string, token: string) =>
	context.testServer.inject({
		method: 'DELETE',
		url: `${ANALYTICS_INTEGRATION_API_PATH}/${id}`,
		headers: { Authorization: `Bearer ${token}` },
	});

export const testIntegrationViaApi = async (context: TestContext, id: string, token: string) =>
	context.testServer.inject({
		method: 'POST',
		url: `${ANALYTICS_INTEGRATION_API_PATH}/${id}/test`,
		headers: { Authorization: `Bearer ${token}` },
	});

/**
 * Find an integration by id directly from DB.
 */
export const findIntegrationById = async (
	id: string,
): Promise<TAnalyticsIntegration | undefined> => {
	const result = await db.query.analyticsIntegration.findFirst({
		where: eq(analyticsIntegration.id, id),
	});
	return result;
};

// Re-export shared helper
export { ensureProSubscription } from '@/tests/shared/helpers';

/**
 * Generate a valid GA4 create DTO.
 */
export const generateGA4CreateDto = (overrides?: Record<string, unknown>) => ({
	providerType: 'google_analytics' as const,
	credentials: {
		measurementId: `G-TEST${Date.now().toString().slice(-6)}`,
		apiSecret: `secret_${Date.now()}`,
	},
	...overrides,
});

/**
 * Generate a valid Matomo create DTO.
 */
export const generateMatomoCreateDto = (overrides?: Record<string, unknown>) => ({
	providerType: 'matomo' as const,
	credentials: {
		matomoUrl: 'https://matomo.example.com',
		siteId: '1',
	},
	...overrides,
});
