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
	});

	describe('pending quantity', () => {
		it('should schedule and clear a pending quantity', async () => {
			await createAddonSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { quantity: 4 });
			const row = (await repository.findByUserAndType(TEST_USER_PRO_ID, 'custom_domain'))!;
			const effectiveAt = daysFromNow(10);

			await repository.schedulePendingQuantity(row, 2, effectiveAt);
			const scheduled = (await repository.findByUserAndType(TEST_USER_PRO_ID, 'custom_domain'))!;
			expect(scheduled.pendingQuantity).toBe(2);
			expect(scheduled.pendingQuantityEffectiveAt).toEqual(effectiveAt);
			expect(scheduled.quantity).toBe(4);

			await repository.clearPendingQuantity(scheduled);
			const cleared = (await repository.findByUserAndType(TEST_USER_PRO_ID, 'custom_domain'))!;
			expect(cleared.pendingQuantity).toBeNull();
			expect(cleared.pendingQuantityEffectiveAt).toBeNull();
		});

		it('should only return pending quantities that are due', async () => {
			await createAddonSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				pendingQuantity: 1,
				pendingQuantityEffectiveAt: daysFromNow(-1),
			});
			await createAddonSubscriptionDirectly(ctx, TEST_USER_2_ID, {
				pendingQuantity: 1,
				pendingQuantityEffectiveAt: daysFromNow(5),
			});

			const due = await repository.findDuePendingQuantities();

			expect(due.map((r) => r.userId)).toEqual([TEST_USER_PRO_ID]);
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
