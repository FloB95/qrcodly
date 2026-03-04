import {
	getTestContext,
	cleanupCreatedSubscriptions,
	BILLING_API_PATH,
	type TestContext,
} from './utils';
import { env } from '@/core/config/env';

describe('POST /billing/checkout-session', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedSubscriptions(ctx);
	});

	it('should return 400 for missing priceId', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${BILLING_API_PATH}/checkout-session`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${ctx.accessTokenPro}`,
			},
			payload: {},
		});

		expect(response.statusCode).toBe(400);
	});

	it('should return 400 for invalid priceId', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${BILLING_API_PATH}/checkout-session`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${ctx.accessTokenPro}`,
			},
			payload: { priceId: 'price_invalid_not_allowed' },
		});

		expect(response.statusCode).toBe(400);
		const data = JSON.parse(response.payload) as { message: string };
		expect(data.message).toContain('Invalid price ID');
	});

	it('should return 401 when not authenticated', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${BILLING_API_PATH}/checkout-session`,
			headers: { 'Content-Type': 'application/json' },
			payload: { priceId: env.STRIPE_PRO_PRICE_ID_MONTHLY },
		});

		expect(response.statusCode).toBe(401);
	});

	it('should create checkout session with valid monthly price', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${BILLING_API_PATH}/checkout-session`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${ctx.accessTokenPro}`,
			},
			payload: { priceId: env.STRIPE_PRO_PRICE_ID_MONTHLY },
		});

		expect(response.statusCode).toBe(200);
		const data = JSON.parse(response.payload) as { url: string };
		expect(data.url).toBeDefined();
		expect(data.url).toContain('stripe.com');
	});

	it('should create checkout session with valid annual price', async () => {
		const response = await ctx.testServer.inject({
			method: 'POST',
			url: `${BILLING_API_PATH}/checkout-session`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${ctx.accessTokenPro}`,
			},
			payload: { priceId: env.STRIPE_PRO_PRICE_ID_ANNUAL },
		});

		expect(response.statusCode).toBe(200);
		const data = JSON.parse(response.payload) as { url: string };
		expect(data.url).toBeDefined();
		expect(data.url).toContain('stripe.com');
	});
});
