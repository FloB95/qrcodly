import {
	getTestContext,
	cleanupCreatedIntegrations,
	createIntegrationDirectly,
	deleteIntegrationViaApi,
	findIntegrationById,
	listIntegrations,
	ANALYTICS_INTEGRATION_API_PATH,
	TEST_USER_PRO_ID,
	TEST_USER_ID,
	type TestContext,
} from './utils';
import { randomUUID } from 'crypto';
import { resetTestState } from '@/tests/shared/test-context';

describe('DELETE /analytics-integration/:id (Delete)', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedIntegrations(ctx);
	});

	it('should delete an integration successfully', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await deleteIntegrationViaApi(ctx, id, ctx.accessTokenPro);

		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as { deleted: boolean };
		expect(result.deleted).toBe(true);

		// Verify it's gone from the database
		const record = await findIntegrationById(id);
		expect(record).toBeUndefined();

		// Remove from tracking since it's already deleted
		ctx.createdIntegrationIds = ctx.createdIntegrationIds.filter((i) => i !== id);
	});

	it('should be possible to create a new integration after deletion', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		await deleteIntegrationViaApi(ctx, id, ctx.accessTokenPro);
		ctx.createdIntegrationIds = ctx.createdIntegrationIds.filter((i) => i !== id);

		// Should now be able to list and see empty
		const listResponse = await listIntegrations(ctx, ctx.accessTokenPro);
		expect(listResponse.statusCode).toBe(200);
		const listed = JSON.parse(listResponse.payload) as unknown[];
		expect(listed).toHaveLength(0);
	});

	it('should return 404 for non-existent integration', async () => {
		const fakeId = randomUUID();
		const response = await deleteIntegrationViaApi(ctx, fakeId, ctx.accessTokenPro);

		expect(response).toHaveStatusCode(404);
	});

	it("should return 403 when deleting another user's integration", async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await deleteIntegrationViaApi(ctx, id, ctx.accessToken2);

		expect(response).toHaveStatusCode(403);
	});

	it('should allow delete even without Pro plan', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_ID);

		const response = await deleteIntegrationViaApi(ctx, id, ctx.accessToken);

		expect(response).toHaveStatusCode(200);

		const result = JSON.parse(response.payload) as { deleted: boolean };
		expect(result.deleted).toBe(true);

		const record = await findIntegrationById(id);
		expect(record).toBeUndefined();

		ctx.createdIntegrationIds = ctx.createdIntegrationIds.filter((i) => i !== id);
	});

	it('should return 401 when not authenticated', async () => {
		const id = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		const response = await ctx.testServer.inject({
			method: 'DELETE',
			url: `${ANALYTICS_INTEGRATION_API_PATH}/${id}`,
		});

		expect(response).toHaveStatusCode(401);
	});
});
