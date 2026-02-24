import {
	getTestContext,
	cleanupCreatedSubscriptions,
	createSubscriptionDirectly,
	getSubscription,
	BILLING_API_PATH,
	TEST_USER_PRO_ID,
	TEST_USER_2_ID,
	type TestContext,
} from './utils';

describe('GET /billing/subscription', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedSubscriptions(ctx);
	});

	it('should return null when user has no subscription', async () => {
		const response = await getSubscription(ctx, ctx.accessToken2);
		expect(response.statusCode).toBe(200);

		const data = JSON.parse(response.payload) as { subscription: null };
		expect(data.subscription).toBeNull();
	});

	it('should return subscription details when user has active subscription', async () => {
		const periodEnd = new Date();
		periodEnd.setDate(periodEnd.getDate() + 30);

		await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
			status: 'active',
			stripePriceId: 'price_test_monthly',
			currentPeriodEnd: periodEnd,
			cancelAtPeriodEnd: false,
		});

		const response = await getSubscription(ctx, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const data = JSON.parse(response.payload) as {
			subscription: {
				status: string;
				stripePriceId: string;
				currentPeriodEnd: string;
				cancelAtPeriodEnd: boolean;
			};
		};

		expect(data.subscription).not.toBeNull();
		expect(data.subscription.status).toBe('active');
		expect(data.subscription.stripePriceId).toBe('price_test_monthly');
		expect(data.subscription.cancelAtPeriodEnd).toBe(false);
		expect(data.subscription.currentPeriodEnd).toBeDefined();
	});

	it('should return null when user has canceled subscription', async () => {
		await createSubscriptionDirectly(ctx, TEST_USER_2_ID, {
			status: 'canceled',
		});

		const response = await getSubscription(ctx, ctx.accessToken2);
		expect(response.statusCode).toBe(200);

		const data = JSON.parse(response.payload) as { subscription: null };
		expect(data.subscription).toBeNull();
	});

	it('should return subscription with cancelAtPeriodEnd flag', async () => {
		const periodEnd = new Date();
		periodEnd.setDate(periodEnd.getDate() + 10);

		await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
			status: 'active',
			cancelAtPeriodEnd: true,
			currentPeriodEnd: periodEnd,
		});

		const response = await getSubscription(ctx, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const data = JSON.parse(response.payload) as {
			subscription: {
				status: string;
				cancelAtPeriodEnd: boolean;
			};
		};

		expect(data.subscription).not.toBeNull();
		expect(data.subscription.status).toBe('active');
		expect(data.subscription.cancelAtPeriodEnd).toBe(true);
	});

	it('should return subscription for past_due status', async () => {
		await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
			status: 'past_due',
		});

		const response = await getSubscription(ctx, ctx.accessTokenPro);
		expect(response.statusCode).toBe(200);

		const data = JSON.parse(response.payload) as {
			subscription: { status: string };
		};

		expect(data.subscription).not.toBeNull();
		expect(data.subscription.status).toBe('past_due');
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'GET',
			url: `${BILLING_API_PATH}/subscription`,
		});

		expect(response.statusCode).toBe(401);
	});
});
