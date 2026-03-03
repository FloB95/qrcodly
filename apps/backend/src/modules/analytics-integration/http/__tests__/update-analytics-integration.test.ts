import type { TAnalyticsIntegrationResponseDto } from '@shared/schemas';
import {
	getTestContext,
	cleanupCreatedIntegrations,
	createIntegrationDirectly,
	updateIntegrationViaApi,
	findIntegrationById,
	ANALYTICS_INTEGRATION_API_PATH,
	TEST_USER_PRO_ID,
	TEST_USER_ID,
	type TestContext,
} from './utils';
import { randomUUID } from 'crypto';

describe('PATCH /analytics-integration/:id (Update)', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedIntegrations(ctx);
	});

	it('should toggle isEnabled off', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{ isEnabled: false },
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.isEnabled).toBe(false);
	});

	it('should toggle isEnabled back on', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID, {
			isEnabled: false,
		});

		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{ isEnabled: true },
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(200);

		const result = JSON.parse(response.payload) as TAnalyticsIntegrationResponseDto;
		expect(result.isEnabled).toBe(true);
	});

	it('should update credentials and reflect new displayIdentifier', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const originalRecord = await findIntegrationById(id);
		expect(originalRecord).toBeDefined();

		const response = await updateIntegrationViaApi(
			ctx,
			id,
			{
				credentials: {
					measurementId: 'G-NEWMEASURE1',
					apiSecret: 'new_secret_value',
				},
			},
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(200);

		// Verify credentials were re-encrypted (different ciphertext)
		const updatedRecord = await findIntegrationById(id);
		expect(updatedRecord).toBeDefined();
		expect(updatedRecord!.encryptedCredentials).not.toBe(originalRecord!.encryptedCredentials);
		expect(updatedRecord!.encryptionIv).not.toBe(originalRecord!.encryptionIv);
	});

	it('should return 404 for non-existent integration', async () => {
		const fakeId = randomUUID();
		const response = await updateIntegrationViaApi(
			ctx,
			fakeId,
			{ isEnabled: false },
			ctx.accessTokenPro,
		);

		expect(response.statusCode).toBe(404);
	});

	it("should return 403 when updating another user's integration", async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await updateIntegrationViaApi(ctx, id, { isEnabled: false }, ctx.accessToken2);

		expect(response.statusCode).toBe(403);
	});

	it('should return 401 when not authenticated', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await ctx.testServer.inject({
			method: 'PATCH',
			url: `${ANALYTICS_INTEGRATION_API_PATH}/${id}`,
			headers: { 'Content-Type': 'application/json' },
			payload: { isEnabled: false },
		});

		expect(response.statusCode).toBe(401);
	});
});
