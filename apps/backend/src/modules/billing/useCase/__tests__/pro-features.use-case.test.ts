import { container } from 'tsyringe';
import {
	getTestContext,
	cleanupCreatedSubscriptions,
	createSubscriptionDirectly,
	type TestContext,
	TEST_USER_PRO_ID,
} from '../../http/__tests__/utils';
import { DisableProFeaturesUseCase } from '../disable-pro-features.use-case';
import { EnableProFeaturesUseCase } from '../enable-pro-features.use-case';
import AnalyticsIntegrationRepository from '@/modules/analytics-integration/domain/repository/analytics-integration.repository';
import UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import db from '@/core/db';
import analyticsIntegration from '@/modules/analytics-integration/domain/entities/analytics-integration.entity';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { CredentialEncryptionService } from '@/modules/analytics-integration/service/credential-encryption.service';

describe('Pro Features Use Cases', () => {
	let ctx: TestContext;
	let disableUseCase: DisableProFeaturesUseCase;
	let enableUseCase: EnableProFeaturesUseCase;
	let analyticsRepo: AnalyticsIntegrationRepository;
	let userSubRepo: UserSubscriptionRepository;
	const createdIntegrationIds: string[] = [];

	beforeAll(async () => {
		ctx = await getTestContext();
		disableUseCase = container.resolve(DisableProFeaturesUseCase);
		enableUseCase = container.resolve(EnableProFeaturesUseCase);
		analyticsRepo = container.resolve(AnalyticsIntegrationRepository);
		userSubRepo = container.resolve(UserSubscriptionRepository);
	});

	afterEach(async () => {
		await cleanupCreatedSubscriptions(ctx);
		for (const id of createdIntegrationIds) {
			try {
				await db.delete(analyticsIntegration).where(eq(analyticsIntegration.id, id)).execute();
			} catch {
				// Ignore
			}
		}
		createdIntegrationIds.length = 0;
	});

	const createTestIntegration = async (userId: string, isEnabled = true): Promise<string> => {
		const id = randomUUID();
		const encryptionService = container.resolve(CredentialEncryptionService);
		const { encrypted, iv, tag } = encryptionService.encrypt({
			measurementId: 'G-TEST123',
			apiSecret: 'secret',
		});

		await db
			.insert(analyticsIntegration)
			.values({
				id,
				providerType: 'google_analytics',
				encryptedCredentials: encrypted,
				encryptionIv: iv,
				encryptionTag: tag,
				isEnabled,
				lastError: null,
				lastErrorAt: null,
				consecutiveFailures: 0,
				createdBy: userId,
				createdAt: new Date(),
				updatedAt: null,
			})
			.execute();

		createdIntegrationIds.push(id);
		return id;
	};

	describe('DisableProFeaturesUseCase', () => {
		it('should disable analytics integrations for the user', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'canceled' });
			const integrationId = await createTestIntegration(TEST_USER_PRO_ID, true);

			await disableUseCase.execute(TEST_USER_PRO_ID);

			const integration = await analyticsRepo.findOneById(integrationId);
			expect(integration).toBeDefined();
			expect(integration!.isEnabled).toBe(false);
		});

		it('should mark proFeaturesDisabledAt on the subscription', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, { status: 'canceled' });
			await createTestIntegration(TEST_USER_PRO_ID, true);

			await disableUseCase.execute(TEST_USER_PRO_ID);

			const subscription = await userSubRepo.findByUserId(TEST_USER_PRO_ID);
			expect(subscription).toBeDefined();
			expect(subscription!.proFeaturesDisabledAt).not.toBeNull();
		});
	});

	describe('EnableProFeaturesUseCase', () => {
		it('should re-enable analytics integrations for the user', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
				gracePeriodEndsAt: new Date(),
				proFeaturesDisabledAt: new Date(),
			});
			const integrationId = await createTestIntegration(TEST_USER_PRO_ID, false);

			await enableUseCase.execute(TEST_USER_PRO_ID);

			const integration = await analyticsRepo.findOneById(integrationId);
			expect(integration).toBeDefined();
			expect(integration!.isEnabled).toBe(true);
		});

		it('should clear grace period fields on the subscription', async () => {
			await createSubscriptionDirectly(ctx, TEST_USER_PRO_ID, {
				status: 'active',
				gracePeriodEndsAt: new Date(),
				proFeaturesDisabledAt: new Date(),
				cancellationNotifiedAt: new Date(),
			});
			await createTestIntegration(TEST_USER_PRO_ID, false);

			await enableUseCase.execute(TEST_USER_PRO_ID);

			const subscription = await userSubRepo.findByUserId(TEST_USER_PRO_ID);
			expect(subscription).toBeDefined();
			expect(subscription!.gracePeriodEndsAt).toBeNull();
			expect(subscription!.proFeaturesDisabledAt).toBeNull();
			expect(subscription!.cancellationNotifiedAt).toBeNull();
		});
	});
});
