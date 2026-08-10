import { env } from '@/core/config/env';
import { API_BASE_PATH } from '@/core/config/constants';
import {
	getTestContext,
	cleanupCreatedSubscriptions,
	cleanupAddonSubscriptionsForUser,
	createSubscriptionDirectly,
	createAddonSubscriptionDirectly,
	type TestContext,
	TEST_USER_PRO_ID,
	TEST_USER_ID,
} from './utils';

const DOMAIN_ADDON_PATH = `${API_BASE_PATH}/billing/domain-addon`;
const ADDON_PRICE_ID = env.STRIPE_ADDON_DOMAIN_PRICE_ID_MONTHLY;

/**
 * Every guard here is deliberately checked before the use case talks to Stripe, so these run
 * against the real Stripe test key without creating anything. The happy path needs a real payment
 * method and is covered by unit tests plus the manual test-mode walkthrough.
 */
describe('Domain add-on API', () => {
	let ctx: TestContext;

	const post = (path: string, payload: Record<string, unknown>, token?: string) =>
		ctx.testServer.inject({
			method: 'POST',
			url: `${DOMAIN_ADDON_PATH}${path}`,
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			payload,
		});

	const get = (token?: string) =>
		ctx.testServer.inject({
			method: 'GET',
			url: DOMAIN_ADDON_PATH,
			headers: token ? { Authorization: `Bearer ${token}` } : {},
		});

	beforeAll(async () => {
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedSubscriptions(ctx);
		await cleanupAddonSubscriptionsForUser(TEST_USER_PRO_ID);
		await cleanupAddonSubscriptionsForUser(TEST_USER_ID);
	});

	describe('GET /billing/domain-addon', () => {
		it('should require authentication', async () => {
			expect(await get()).toHaveStatusCode(401);
		});

		it('should report no entitlement for a user without Pro', async () => {
			const response = await get(ctx.accessToken);

			expect(response).toHaveStatusCode(200);
			const body = response.json();
			expect(body.addon).toBeNull();
			expect(body.entitlement).toMatchObject({ baseLimit: 0, addonSlots: 0, effectiveLimit: 0 });
		});

		it('should report the plan allowance for a Pro user without the add-on', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });

			const response = await get(ctx.accessTokenPro);

			expect(response).toHaveStatusCode(200);
			expect(response.json().entitlement).toMatchObject({
				baseLimit: 1,
				addonSlots: 0,
				effectiveLimit: 1,
			});
		});

		it('should add purchased slots to the allowance', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });
			await createAddonSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
				quantity: 3,
			});

			const response = await get(ctx.accessTokenPro);

			expect(response).toHaveStatusCode(200);
			expect(response.json().entitlement).toMatchObject({
				baseLimit: 1,
				addonSlots: 3,
				effectiveLimit: 4,
			});
			expect(response.json().addon).toMatchObject({ quantity: 3, status: 'active' });
		});
	});

	describe('POST /billing/domain-addon/checkout-session', () => {
		it('should require authentication', async () => {
			const response = await post('/checkout-session', {
				priceId: ADDON_PRICE_ID,
				quantity: 1,
			});

			expect(response).toHaveStatusCode(401);
		});

		it('should reject a price ID that is not the add-on', async () => {
			const response = await post(
				'/checkout-session',
				{ priceId: env.STRIPE_PRO_PRICE_ID_MONTHLY, quantity: 1 },
				ctx.accessTokenPro,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject a quantity above the maximum', async () => {
			const response = await post(
				'/checkout-session',
				{ priceId: ADDON_PRICE_ID, quantity: 999 },
				ctx.accessTokenPro,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject a quantity below one', async () => {
			const response = await post(
				'/checkout-session',
				{ priceId: ADDON_PRICE_ID, quantity: 0 },
				ctx.accessTokenPro,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should reject a redirect to a foreign origin', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });

			const response = await post(
				'/checkout-session',
				{
					priceId: ADDON_PRICE_ID,
					quantity: 1,
					successUrl: 'https://evil.example.com/stolen',
				},
				ctx.accessTokenPro,
			);

			expect(response).toHaveStatusCode(400);
		});

		it('should refuse without an active Pro subscription', async () => {
			const response = await post(
				'/checkout-session',
				{ priceId: ADDON_PRICE_ID, quantity: 1 },
				ctx.accessToken,
			);

			expect(response).toHaveStatusCode(403);
		});

		it('should refuse when Pro is canceled', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'canceled' });

			const response = await post(
				'/checkout-session',
				{ priceId: ADDON_PRICE_ID, quantity: 1 },
				ctx.accessTokenPro,
			);

			expect(response).toHaveStatusCode(403);
		});

		it('should refuse a second purchase while an add-on is active', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });
			await createAddonSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });

			const response = await post(
				'/checkout-session',
				{ priceId: ADDON_PRICE_ID, quantity: 1 },
				ctx.accessTokenPro,
			);

			expect(response).toHaveStatusCode(409);
		});
	});

	describe('PATCH /billing/domain-addon/quantity', () => {
		const patch = (payload: Record<string, unknown>, token?: string) =>
			ctx.testServer.inject({
				method: 'PATCH',
				url: `${DOMAIN_ADDON_PATH}/quantity`,
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				payload,
			});

		it('should require authentication', async () => {
			expect(await patch({ quantity: 2 })).toHaveStatusCode(401);
		});

		it('should refuse without an active Pro subscription', async () => {
			expect(await patch({ quantity: 2 }, ctx.accessToken)).toHaveStatusCode(403);
		});

		it('should return 404 when the user has no add-on', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });

			expect(await patch({ quantity: 2 }, ctx.accessTokenPro)).toHaveStatusCode(404);
		});

		it('should reject an out-of-range quantity', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });

			expect(await patch({ quantity: 999 }, ctx.accessTokenPro)).toHaveStatusCode(400);
		});
	});

	describe('DELETE /billing/domain-addon', () => {
		const remove = (token?: string) =>
			ctx.testServer.inject({
				method: 'DELETE',
				url: DOMAIN_ADDON_PATH,
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});

		it('should require authentication', async () => {
			expect(await remove()).toHaveStatusCode(401);
		});

		it('should return 404 when the user has no add-on', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'active' });

			expect(await remove(ctx.accessTokenPro)).toHaveStatusCode(404);
		});
	});
});
