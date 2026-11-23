import { container } from 'tsyringe';
import { randomUUID } from 'crypto';
import { KeyCache } from '@/core/cache';
import { DeleteAnalyticsDataOnUserDeletedEventHandler } from '../../event/handler/user-deleted.event-handler';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { resetTestState } from '@/tests/shared/test-context';
import { SCAN_IP_EXCLUSION_CACHE_KEY_PREFIX } from '../../config/constants';
import {
	getTestContext,
	cleanupCreatedIntegrations,
	createIntegrationDirectly,
	findIntegrationById,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';
import {
	cleanupScanIpExclusions,
	findScanIpExclusion,
	insertScanIpExclusion,
} from './scan-ip-exclusion-utils';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('analytics data on user deletion', () => {
	let ctx: TestContext;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
	});

	afterEach(async () => {
		await cleanupCreatedIntegrations(ctx);
		await cleanupScanIpExclusions(TEST_USER_PRO_ID);
	});

	it("deletes the deleted user's integrations and excluded IP ranges, keeping other users' ones", async () => {
		const deletedUserId = `user_${randomUUID()}`;
		const ga4Id = await createIntegrationDirectly(ctx, deletedUserId);
		const matomoId = await createIntegrationDirectly(ctx, deletedUserId, {
			providerType: 'matomo',
		});
		const otherId = await createIntegrationDirectly(ctx, TEST_USER_PRO_ID);
		const exclusionId = await insertScanIpExclusion(deletedUserId, '203.0.113.0/24');
		const otherExclusionId = await insertScanIpExclusion(TEST_USER_PRO_ID, '203.0.113.0/24');
		const keyCache = container.resolve(KeyCache);
		const cacheKey = `${SCAN_IP_EXCLUSION_CACHE_KEY_PREFIX}${deletedUserId}`;
		await keyCache.set(cacheKey, JSON.stringify(['203.0.113.0/24']), 60);

		// only this module's handler, not the full user deletion of every module
		await new DeleteAnalyticsDataOnUserDeletedEventHandler().handle(
			new UserDeletedEvent({ id: deletedUserId }),
		);

		for (let attempt = 0; attempt < 50; attempt++) {
			const remaining = await Promise.all([
				findIntegrationById(ga4Id),
				findIntegrationById(matomoId),
				findScanIpExclusion(exclusionId),
			]);
			if (remaining.every((row) => row === undefined) && (await keyCache.get(cacheKey)) === null) {
				expect(await findIntegrationById(otherId)).toBeDefined();
				expect(await findScanIpExclusion(otherExclusionId)).toBeDefined();
				return;
			}
			await sleep(100);
		}
		throw new Error('Analytics data of the deleted user was not deleted');
	});
});
