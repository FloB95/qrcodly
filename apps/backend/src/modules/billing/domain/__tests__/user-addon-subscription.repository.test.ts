import {
	getTestContext,
	cleanupCreatedSubscriptions,
	cleanupAddonSubscriptionsForUser,
	createAddonSubscriptionDirectly,
	type TestContext,
	TEST_USER_PRO_ID,
	TEST_USER_2_ID,
} from '../../http/__tests__/utils';
import UserAddonSubscriptionRepository, {
	type TAddonSubscriptionSyncData,
} from '../repository/user-addon-subscription.repository';
import { container } from 'tsyringe';

/** Milliseconds are zeroed because MySQL `datetime` stores whole seconds and rounds. */
const daysFromNow = (days: number) => {
	const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
	date.setMilliseconds(0);
	return date;
};

const syncData = (
	overrides: Partial<TAddonSubscriptionSyncData> = {},
): TAddonSubscriptionSyncData => ({
	userId: TEST_USER_PRO_ID,
	addonType: 'custom_domain',
	stripeCustomerId: 'cus_addon',
	stripeSubscriptionId: 'sub_addon_1',
	stripePriceId: 'price_addon_monthly',
	status: 'active',
	quantity: 2,
	currentPeriodStart: daysFromNow(-1),
	currentPeriodEnd: daysFromNow(29),
	cancelAtPeriodEnd: false,
	...overrides,
});

describe('UserAddonSubscriptionRepository', () => {
	let ctx: TestContext;
	let repository: UserAddonSubscriptionRepository;

	beforeAll(async () => {
		ctx = await getTestContext();
		repository = container.resolve(UserAddonSubscriptionRepository);
	});

	afterEach(async () => {
		await cleanupCreatedSubscriptions(ctx);
		await cleanupAddonSubscriptionsForUser(TEST_USER_PRO_ID);
		await cleanupAddonSubscriptionsForUser(TEST_USER_2_ID);
	});

	describe('findByUserAndType', () => {
		it('should return the add-on for a user', async () => {
			await createAddonSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { quantity: 3 });

			const found = await repository.findByUserAndType(TEST_USER_PRO_ID, 'custom_domain');

			expect(found).toBeDefined();
			expect(found!.quantity).toBe(3);
		});

		it('should return undefined when the user has no add-on', async () => {
			expect(await repository.findByUserAndType(TEST_USER_2_ID, 'custom_domain')).toBeUndefined();
		});
	});

	describe('upsertByUserAndType', () => {
		it('should insert a new add-on', async () => {
			const row = await repository.upsertByUserAndType(syncData());

			expect(row.id).toBeTruthy();
			expect(row.quantity).toBe(2);
			expect(row.stripeSubscriptionId).toBe('sub_addon_1');
		});

		it('should update an existing add-on in place', async () => {
			const created = await repository.upsertByUserAndType(syncData());
			const updated = await repository.upsertByUserAndType(
				syncData({ quantity: 5, status: 'past_due' }),
			);

			expect(updated.id).toBe(created.id);
			expect(updated.quantity).toBe(5);
			expect(updated.status).toBe('past_due');
		});

		it('should adopt a new subscription id when the user re-subscribes', async () => {
			await repository.upsertByUserAndType(
				syncData({ stripeSubscriptionId: 'sub_addon_old', status: 'canceled' }),
			);

			const row = await repository.upsertByUserAndType(
				syncData({ stripeSubscriptionId: 'sub_addon_new', status: 'active' }),
			);

			expect(row.stripeSubscriptionId).toBe('sub_addon_new');
			expect(await repository.findByStripeSubscriptionId('sub_addon_old')).toBeUndefined();
			expect(await repository.findByStripeSubscriptionId('sub_addon_new')).toBeDefined();
		});

		it('should keep the stored lastStripeEventAt when none is supplied', async () => {
			const eventAt = daysFromNow(-2);
			await repository.upsertByUserAndType(syncData({ lastStripeEventAt: eventAt }));

			const row = await repository.upsertByUserAndType(syncData({ quantity: 4 }));

			expect(row.lastStripeEventAt).toEqual(eventAt);
		});

		// Three-valued on purpose: a caller that only looked at the subscription must be able to
		// leave a schedule it never inspected alone.
		describe('scheduledChange', () => {
			const effectiveAt = daysFromNow(29);

			it('should store a parked reduction', async () => {
				const row = await repository.upsertByUserAndType(
					syncData({
						scheduledChange: { stripeScheduleId: 'sub_sched_1', quantity: 1, effectiveAt },
					}),
				);

				expect(row.stripeScheduleId).toBe('sub_sched_1');
				expect(row.scheduledQuantity).toBe(1);
				expect(row.scheduledQuantityEffectiveAt).toEqual(effectiveAt);
			});

			it('should leave an existing mirror untouched when omitted', async () => {
				await repository.upsertByUserAndType(
					syncData({
						scheduledChange: { stripeScheduleId: 'sub_sched_1', quantity: 1, effectiveAt },
					}),
				);

				const row = await repository.upsertByUserAndType(syncData({ quantity: 3 }));

				expect(row.quantity).toBe(3);
				expect(row.scheduledQuantity).toBe(1);
				expect(row.stripeScheduleId).toBe('sub_sched_1');
			});

			it('should clear the mirror when explicitly set to null', async () => {
				await repository.upsertByUserAndType(
					syncData({
						scheduledChange: { stripeScheduleId: 'sub_sched_1', quantity: 1, effectiveAt },
					}),
				);

				const row = await repository.upsertByUserAndType(syncData({ scheduledChange: null }));

				expect(row.stripeScheduleId).toBeNull();
				expect(row.scheduledQuantity).toBeNull();
				expect(row.scheduledQuantityEffectiveAt).toBeNull();
			});

			it('should find a row by its schedule id', async () => {
				await repository.upsertByUserAndType(
					syncData({
						scheduledChange: { stripeScheduleId: 'sub_sched_1', quantity: 1, effectiveAt },
					}),
				);

				// The release webhook carries no subscription id, only the schedule's own.
				const found = await repository.findByStripeScheduleId('sub_sched_1');

				expect(found?.userId).toBe(TEST_USER_PRO_ID);
			});

			it('should reset the reminder marker when the reduction is withdrawn', async () => {
				const row = await repository.upsertByUserAndType(
					syncData({
						scheduledChange: { stripeScheduleId: 'sub_sched_1', quantity: 1, effectiveAt },
					}),
				);
				await repository.markCancellationReminderSent(row);

				await repository.clearScheduledQuantity(row);

				const after = await repository.findByUserAndType(TEST_USER_PRO_ID, 'custom_domain');
				expect(after?.scheduledQuantity).toBeNull();
				expect(after?.cancellationReminderSentAt).toBeNull();
			});
		});
	});

	describe('lifecycle queries', () => {
		it('should find expired unprocessed grace periods', async () => {
			await createAddonSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'canceled',
				gracePeriodEndsAt: daysFromNow(-1),
			});
			await createAddonSubscriptionDirectly(ctx, TEST_USER_2_ID, {
				status: 'canceled',
				gracePeriodEndsAt: daysFromNow(-1),
				addonFeaturesDisabledAt: new Date(),
			});

			const expired = await repository.findExpiredUnprocessedGracePeriods();

			expect(expired.map((r) => r.userId)).toEqual([TEST_USER_PRO_ID]);
		});

		it('should find pending cancellation reminders within the threshold', async () => {
			await createAddonSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				cancelAtPeriodEnd: true,
				currentPeriodEnd: daysFromNow(2),
			});
			await createAddonSubscriptionDirectly(ctx, TEST_USER_2_ID, {
				cancelAtPeriodEnd: true,
				currentPeriodEnd: daysFromNow(20),
			});

			const pending = await repository.findPendingCancellationReminders(3);

			expect(pending.map((r) => r.userId)).toEqual([TEST_USER_PRO_ID]);
		});

		it('should exclude canceled add-ons from findAllNonCanceled', async () => {
			await createAddonSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });
			await createAddonSubscriptionDirectly(ctx, TEST_USER_2_ID, { status: 'canceled' });

			const rows = await repository.findAllNonCanceled();

			expect(rows.map((r) => r.userId)).toEqual([TEST_USER_PRO_ID]);
		});
	});
});
