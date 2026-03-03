import db from '@/core/db';
import { KeyCache } from '@/core/cache';
import userSubscription from '@/modules/billing/domain/entities/user-subscription.entity';
import { TEST_USER_PRO_ID } from '@/tests/shared/test-context';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { container } from 'tsyringe';

/**
 * Ensure the pro test user has an active subscription in the DB.
 * Also flushes the plan cache so the middleware picks it up immediately.
 */
export const ensureProSubscription = async (): Promise<void> => {
	const existing = await db.query.userSubscription.findFirst({
		where: eq(userSubscription.userId, TEST_USER_PRO_ID),
	});

	if (!existing || (existing.status !== 'active' && existing.status !== 'trialing')) {
		if (existing) {
			await db
				.update(userSubscription)
				.set({ status: 'active', updatedAt: new Date() })
				.where(eq(userSubscription.id, existing.id))
				.execute();
		} else {
			const now = new Date();
			const periodEnd = new Date();
			periodEnd.setDate(periodEnd.getDate() + 30);

			await db
				.insert(userSubscription)
				.values({
					id: randomUUID(),
					userId: TEST_USER_PRO_ID,
					stripeCustomerId: `cus_test_pro_${randomUUID().slice(0, 8)}`,
					stripeSubscriptionId: `sub_test_pro_${randomUUID().slice(0, 8)}`,
					stripePriceId: 'price_test_monthly',
					status: 'active',
					currentPeriodStart: now,
					currentPeriodEnd: periodEnd,
					cancelAtPeriodEnd: false,
					createdAt: now,
					updatedAt: now,
				})
				.execute();
		}
	}

	// Flush plan cache so middleware re-resolves immediately
	const cache = container.resolve(KeyCache);
	await cache.del(`user_plan:${TEST_USER_PRO_ID}`);
};
