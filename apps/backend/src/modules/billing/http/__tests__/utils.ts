import { API_BASE_PATH } from '@/core/config/constants';
import {
	getTestContext as getGlobalTestContext,
	TEST_USER_PRO_ID,
	TEST_USER_2_ID,
	TEST_USER_ID,
} from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';
import db from '@/core/db';
import userSubscription from '../../domain/entities/user-subscription.entity';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { TUserSubscription } from '../../domain/entities/user-subscription.entity';

export const BILLING_API_PATH = `${API_BASE_PATH}/billing`;

// Re-export for convenience in tests
export { TEST_USER_PRO_ID, TEST_USER_2_ID, TEST_USER_ID };

export interface TestContext {
	testServer: FastifyInstance;
	accessToken: string;
	accessToken2: string;
	accessTokenPro: string;
	createdSubscriptionIds: string[];
}

const contextCreatedSubscriptionIds: string[] = [];

/**
 * Gets the shared test context.
 */
export const getTestContext = async (): Promise<TestContext> => {
	const ctx = await getGlobalTestContext();

	// Clean up any existing subscriptions from previous test runs on first call
	if (contextCreatedSubscriptionIds.length === 0) {
		await cleanupSubscriptionsForUser(TEST_USER_PRO_ID);
		await cleanupSubscriptionsForUser(TEST_USER_2_ID);
		await cleanupSubscriptionsForUser(TEST_USER_ID);
	}

	return {
		testServer: ctx.testServer,
		accessToken: ctx.accessToken,
		accessToken2: ctx.accessToken2,
		accessTokenPro: ctx.accessTokenPro,
		createdSubscriptionIds: contextCreatedSubscriptionIds,
	};
};

/**
 * Helper to directly create a user subscription in the database.
 */
export const createSubscriptionDirectly = async (
	context: TestContext,
	userId: string,
	options: Partial<Omit<TUserSubscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = {},
): Promise<string> => {
	const id = randomUUID();
	const now = new Date();
	const periodEnd = new Date();
	periodEnd.setDate(periodEnd.getDate() + 30);

	await db
		.insert(userSubscription)
		.values({
			id,
			userId,
			stripeCustomerId: options.stripeCustomerId ?? `cus_test_${randomUUID().slice(0, 8)}`,
			stripeSubscriptionId: options.stripeSubscriptionId ?? `sub_test_${randomUUID().slice(0, 8)}`,
			stripePriceId: options.stripePriceId ?? 'price_test_monthly',
			status: options.status ?? 'active',
			currentPeriodStart: options.currentPeriodStart ?? now,
			currentPeriodEnd: options.currentPeriodEnd ?? periodEnd,
			cancelAtPeriodEnd: options.cancelAtPeriodEnd ?? false,
			gracePeriodEndsAt: options.gracePeriodEndsAt ?? null,
			domainsDisabledAt: options.domainsDisabledAt ?? null,
			cancellationNotifiedAt: options.cancellationNotifiedAt ?? null,
			cancellationReminderSentAt: options.cancellationReminderSentAt ?? null,
			pastDueNotifiedAt: options.pastDueNotifiedAt ?? null,
			createdAt: now,
			updatedAt: now,
		})
		.execute();

	context.createdSubscriptionIds.push(id);
	return id;
};

/**
 * Helper to delete a subscription from the database.
 */
export const deleteSubscriptionDirectly = async (subscriptionId: string) => {
	await db.delete(userSubscription).where(eq(userSubscription.id, subscriptionId)).execute();
};

/**
 * Clean up all subscriptions for a user.
 */
export const cleanupSubscriptionsForUser = async (userIdToCleanup: string) => {
	await db.delete(userSubscription).where(eq(userSubscription.userId, userIdToCleanup)).execute();
};

/**
 * Clean up created subscriptions after each test.
 */
export const cleanupCreatedSubscriptions = async (context: TestContext) => {
	for (const id of context.createdSubscriptionIds) {
		try {
			await deleteSubscriptionDirectly(id);
		} catch {
			// Ignore if already deleted
		}
	}
	context.createdSubscriptionIds.length = 0;
};

// API helper functions

export const createCheckoutSession = async (
	context: TestContext,
	payload: { priceId: string; locale?: string; successUrl?: string; cancelUrl?: string },
	token: string,
) =>
	context.testServer.inject({
		method: 'POST',
		url: `${BILLING_API_PATH}/checkout-session`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		payload,
	});

export const createPortalSession = async (
	context: TestContext,
	payload: { locale?: string; returnUrl?: string },
	token: string,
) =>
	context.testServer.inject({
		method: 'POST',
		url: `${BILLING_API_PATH}/portal-session`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		payload,
	});

export const getSubscription = async (context: TestContext, token: string) =>
	context.testServer.inject({
		method: 'GET',
		url: `${BILLING_API_PATH}/subscription`,
		headers: { Authorization: `Bearer ${token}` },
	});

/**
 * Find a subscription by userId directly from DB.
 */
export const findSubscriptionByUserId = async (
	userId: string,
): Promise<TUserSubscription | undefined> => {
	const result = await db.query.userSubscription.findFirst({
		where: eq(userSubscription.userId, userId),
	});
	return result;
};
