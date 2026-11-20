import { container } from 'tsyringe';
import { randomUUID } from 'crypto';
import { EventEmitter } from '@/core/event/event.emitter';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { resetTestState } from '@/tests/shared/test-context';
import {
	getTestContext,
	cleanupCreatedIntegrations,
	createIntegrationDirectly,
	findIntegrationById,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('analytics integrations on user deletion', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedIntegrations(ctx);
	});

	it("deletes the deleted user's integrations and keeps other users' ones", async () => {
		const deletedUserId = `user_${randomUUID()}`;
		const ga4Id = await createIntegrationDirectly(ctx, deletedUserId);
		const matomoId = await createIntegrationDirectly(ctx, deletedUserId, {
			providerType: 'matomo',
		});
		const otherId = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);

		container.resolve(EventEmitter).emit(new UserDeletedEvent({ id: deletedUserId }));

		for (let attempt = 0; attempt < 50; attempt++) {
			const remaining = await Promise.all([
				findIntegrationById(ga4Id),
				findIntegrationById(matomoId),
			]);
			if (remaining.every((row) => row === undefined)) {
				expect(await findIntegrationById(otherId)).toBeDefined();
				return;
			}
			await sleep(100);
		}
		throw new Error('Analytics integrations were not deleted');
	});
});
