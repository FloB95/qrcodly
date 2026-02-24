import {
	getTestContext,
	cleanupCreatedSubscriptions,
	createSubscriptionDirectly,
	cleanupSubscriptionsForUser,
	type TestContext,
	TEST_USER_PRO_ID,
	TEST_USER_2_ID,
} from '../../http/__tests__/utils';
import UserSubscriptionRepository from '../repository/user-subscription.repository';
import { container } from 'tsyringe';

describe('UserSubscriptionRepository', () => {
	let ctx: TestContext;
	let repository: UserSubscriptionRepository;

	beforeAll(async () => {
		ctx = await getTestContext();
		repository = container.resolve(UserSubscriptionRepository);
	});

	afterEach(async () => {
		await cleanupCreatedSubscriptions(ctx);
	});

	describe('findByUserId', () => {
		it('should return subscription for existing user', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
			});

			const result = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(result).toBeDefined();
			expect(result!.userId).toBe(TEST_USER_PRO_ID);
			expect(result!.status).toBe('active');
		});

		it('should return undefined for non-existing user', async () => {
			const result = await repository.findByUserId('non_existing_user');
			expect(result).toBeUndefined();
		});
	});

	describe('findByStripeSubscriptionId', () => {
		it('should return subscription by stripe subscription ID', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				stripeSubscriptionId: 'sub_findtest_123',
			});

			const result = await repository.findByStripeSubscriptionId('sub_findtest_123');
			expect(result).toBeDefined();
			expect(result!.stripeSubscriptionId).toBe('sub_findtest_123');
		});

		it('should return undefined for non-existing stripe subscription ID', async () => {
			const result = await repository.findByStripeSubscriptionId('sub_nonexistent');
			expect(result).toBeUndefined();
		});
	});

	describe('upsertByStripeSubscriptionId', () => {
		it('should insert new subscription', async () => {
			const now = new Date();
			const periodEnd = new Date();
			periodEnd.setDate(periodEnd.getDate() + 30);

			await repository.upsertByStripeSubscriptionId({
				id: 'test-upsert-insert',
				userId: TEST_USER_2_ID,
				stripeCustomerId: 'cus_upsert_test',
				stripeSubscriptionId: 'sub_upsert_test',
				stripePriceId: 'price_monthly',
				status: 'active',
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
				cancelAtPeriodEnd: false,
				updatedAt: now,
			});
			ctx.createdSubscriptionIds.push('test-upsert-insert');

			const result = await repository.findByStripeSubscriptionId('sub_upsert_test');
			expect(result).toBeDefined();
			expect(result!.status).toBe('active');
		});

		it('should update existing subscription', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				stripeSubscriptionId: 'sub_upsert_update',
				status: 'active',
			});

			const existing = await repository.findByStripeSubscriptionId('sub_upsert_update');
			expect(existing).toBeDefined();

			const now = new Date();
			await repository.upsertByStripeSubscriptionId({
				id: existing!.id,
				userId: existing!.userId,
				stripeCustomerId: existing!.stripeCustomerId,
				stripeSubscriptionId: 'sub_upsert_update',
				stripePriceId: 'price_annual',
				status: 'past_due',
				currentPeriodStart: existing!.currentPeriodStart,
				currentPeriodEnd: existing!.currentPeriodEnd,
				cancelAtPeriodEnd: true,
				updatedAt: now,
			});

			const updated = await repository.findByStripeSubscriptionId('sub_upsert_update');
			expect(updated).toBeDefined();
			expect(updated!.status).toBe('past_due');
			expect(updated!.stripePriceId).toBe('price_annual');
			expect(updated!.cancelAtPeriodEnd).toBe(true);
		});
	});

	describe('findAllNonCanceled', () => {
		it('should return only non-canceled subscriptions', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
			});
			await createSubscriptionDirectly(ctx, TEST_USER_2_ID, {
				status: 'canceled',
			});

			const results = await repository.findAllNonCanceled();
			const userIds = results.map((r) => r.userId);

			expect(userIds).toContain(TEST_USER_PRO_ID);
			expect(userIds).not.toContain(TEST_USER_2_ID);
		});
	});

	describe('update', () => {
		it('should update subscription fields', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
			});

			const subscription = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(subscription).toBeDefined();

			await repository.update(subscription!, { status: 'canceled' });

			const updated = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(updated!.status).toBe('canceled');
		});
	});

	describe('grace period operations', () => {
		it('should find expired unprocessed grace periods', async () => {
			const expiredDate = new Date();
			expiredDate.setDate(expiredDate.getDate() - 1);

			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'canceled',
				gracePeriodEndsAt: expiredDate,
				domainsDisabledAt: null,
			});

			const results = await repository.findExpiredUnprocessedGracePeriods();
			expect(results.length).toBeGreaterThanOrEqual(1);
			expect(results.some((r) => r.userId === TEST_USER_PRO_ID)).toBe(true);
		});

		it('should not find grace periods that are not yet expired', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 5);

			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'canceled',
				gracePeriodEndsAt: futureDate,
				domainsDisabledAt: null,
			});

			const results = await repository.findExpiredUnprocessedGracePeriods();
			expect(results.some((r) => r.userId === TEST_USER_PRO_ID)).toBe(false);
		});

		it('should not find already-processed grace periods', async () => {
			const expiredDate = new Date();
			expiredDate.setDate(expiredDate.getDate() - 1);

			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'canceled',
				gracePeriodEndsAt: expiredDate,
				domainsDisabledAt: new Date(),
			});

			const results = await repository.findExpiredUnprocessedGracePeriods();
			expect(results.some((r) => r.userId === TEST_USER_PRO_ID)).toBe(false);
		});

		it('should mark domains as disabled', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID);

			await repository.markDomainsDisabled(TEST_USER_PRO_ID);

			const subscription = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(subscription!.domainsDisabledAt).not.toBeNull();
		});

		it('should clear grace period fields', async () => {
			const expiredDate = new Date();
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				gracePeriodEndsAt: expiredDate,
				domainsDisabledAt: new Date(),
				cancellationNotifiedAt: new Date(),
				cancellationReminderSentAt: new Date(),
			});

			await repository.clearGracePeriod(TEST_USER_PRO_ID);

			const subscription = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(subscription!.gracePeriodEndsAt).toBeNull();
			expect(subscription!.domainsDisabledAt).toBeNull();
			expect(subscription!.cancellationNotifiedAt).toBeNull();
			expect(subscription!.cancellationReminderSentAt).toBeNull();
		});
	});

	describe('cancellation notification operations', () => {
		it('should mark cancellation notified', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID);

			await repository.markCancellationNotified(TEST_USER_PRO_ID);

			const subscription = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(subscription!.cancellationNotifiedAt).not.toBeNull();
		});

		it('should mark cancellation reminder sent', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID);

			await repository.markCancellationReminderSent(TEST_USER_PRO_ID);

			const subscription = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(subscription!.cancellationReminderSentAt).not.toBeNull();
		});

		it('should clear cancellation notifications', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				cancellationNotifiedAt: new Date(),
				cancellationReminderSentAt: new Date(),
			});

			await repository.clearCancellationNotifications(TEST_USER_PRO_ID);

			const subscription = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(subscription!.cancellationNotifiedAt).toBeNull();
			expect(subscription!.cancellationReminderSentAt).toBeNull();
		});
	});

	describe('findPendingCancellationReminders', () => {
		it('should find subscriptions ending within threshold', async () => {
			const endingSoon = new Date();
			endingSoon.setDate(endingSoon.getDate() + 2);

			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
				cancelAtPeriodEnd: true,
				currentPeriodEnd: endingSoon,
				cancellationReminderSentAt: null,
			});

			const results = await repository.findPendingCancellationReminders(3);
			expect(results.some((r) => r.userId === TEST_USER_PRO_ID)).toBe(true);
		});

		it('should not find subscriptions already reminded', async () => {
			const endingSoon = new Date();
			endingSoon.setDate(endingSoon.getDate() + 2);

			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
				cancelAtPeriodEnd: true,
				currentPeriodEnd: endingSoon,
				cancellationReminderSentAt: new Date(),
			});

			const results = await repository.findPendingCancellationReminders(3);
			expect(results.some((r) => r.userId === TEST_USER_PRO_ID)).toBe(false);
		});

		it('should not find subscriptions not marked for cancellation', async () => {
			const endingSoon = new Date();
			endingSoon.setDate(endingSoon.getDate() + 2);

			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
				cancelAtPeriodEnd: false,
				currentPeriodEnd: endingSoon,
			});

			const results = await repository.findPendingCancellationReminders(3);
			expect(results.some((r) => r.userId === TEST_USER_PRO_ID)).toBe(false);
		});
	});

	describe('delete', () => {
		it('should delete subscription', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID);

			const subscription = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(subscription).toBeDefined();

			const result = await repository.delete(subscription!);
			expect(result).toBe(true);

			const deleted = await repository.findByUserId(TEST_USER_PRO_ID);
			expect(deleted).toBeUndefined();

			// Remove from cleanup list since already deleted
			const idx = ctx.createdSubscriptionIds.indexOf(subscription!.id);
			if (idx > -1) ctx.createdSubscriptionIds.splice(idx, 1);
		});
	});
});
