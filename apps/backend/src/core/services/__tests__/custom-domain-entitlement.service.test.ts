import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { CustomDomainEntitlementService } from '../custom-domain-entitlement.service';
import type UserSubscriptionRepository from '@/modules/billing/domain/repository/user-subscription.repository';
import type UserAddonSubscriptionRepository from '@/modules/billing/domain/repository/user-addon-subscription.repository';
import { type TUserSubscription } from '@/modules/billing/domain/entities/user-subscription.entity';
import { type TUserAddonSubscription } from '@/modules/billing/domain/entities/user-addon-subscription.entity';

const USER_ID = 'user-123';

const proSubscription = (status: string): TUserSubscription =>
	({ userId: USER_ID, status }) as TUserSubscription;

const addonSubscription = (
	overrides: Partial<TUserAddonSubscription> = {},
): TUserAddonSubscription =>
	({
		userId: USER_ID,
		addonType: 'custom_domain',
		status: 'active',
		quantity: 3,
		addonFeaturesDisabledAt: null,
		...overrides,
	}) as TUserAddonSubscription;

describe('CustomDomainEntitlementService', () => {
	let service: CustomDomainEntitlementService;
	let mockSubscriptionRepository: MockProxy<UserSubscriptionRepository>;
	let mockAddonRepository: MockProxy<UserAddonSubscriptionRepository>;

	beforeEach(() => {
		mockSubscriptionRepository = mock<UserSubscriptionRepository>();
		mockAddonRepository = mock<UserAddonSubscriptionRepository>();
		service = new CustomDomainEntitlementService(mockSubscriptionRepository, mockAddonRepository);

		mockSubscriptionRepository.findByUserId.mockResolvedValue(undefined);
		mockAddonRepository.findByUserAndType.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should grant nothing without a subscription', async () => {
		expect(await service.getCustomDomainLimit(USER_ID)).toEqual({
			baseLimit: 0,
			addonSlots: 0,
			effectiveLimit: 0,
		});
	});

	it.each(['active', 'trialing'])('should grant the plan allowance while %s', async (status) => {
		mockSubscriptionRepository.findByUserId.mockResolvedValue(proSubscription(status));

		expect(await service.getCustomDomainLimit(USER_ID)).toEqual({
			baseLimit: 1,
			addonSlots: 0,
			effectiveLimit: 1,
		});
	});

	it('should add purchased slots on top of the plan allowance', async () => {
		mockSubscriptionRepository.findByUserId.mockResolvedValue(proSubscription('active'));
		mockAddonRepository.findByUserAndType.mockResolvedValue(addonSubscription({ quantity: 3 }));

		expect(await service.getCustomDomainLimit(USER_ID)).toEqual({
			baseLimit: 1,
			addonSlots: 3,
			effectiveLimit: 4,
		});
	});

	it('should grant no slots when Pro has lapsed but the add-on is still active', async () => {
		mockSubscriptionRepository.findByUserId.mockResolvedValue(proSubscription('canceled'));
		mockAddonRepository.findByUserAndType.mockResolvedValue(addonSubscription({ quantity: 5 }));

		expect(await service.getCustomDomainLimit(USER_ID)).toEqual({
			baseLimit: 0,
			addonSlots: 0,
			effectiveLimit: 0,
		});
	});

	it('should grant no slots while Pro is past due', async () => {
		mockSubscriptionRepository.findByUserId.mockResolvedValue(proSubscription('past_due'));
		mockAddonRepository.findByUserAndType.mockResolvedValue(addonSubscription());

		expect(await service.getCustomDomainLimit(USER_ID)).toEqual({
			baseLimit: 0,
			addonSlots: 0,
			effectiveLimit: 0,
		});
	});

	it.each(['past_due', 'canceled', 'unpaid', 'incomplete'])(
		'should ignore an add-on that is %s',
		async (status) => {
			mockSubscriptionRepository.findByUserId.mockResolvedValue(proSubscription('active'));
			mockAddonRepository.findByUserAndType.mockResolvedValue(addonSubscription({ status }));

			const entitlement = await service.getCustomDomainLimit(USER_ID);

			expect(entitlement.addonSlots).toBe(0);
			expect(entitlement.effectiveLimit).toBe(1);
		},
	);

	it('should ignore an add-on whose features were already disabled', async () => {
		mockSubscriptionRepository.findByUserId.mockResolvedValue(proSubscription('active'));
		mockAddonRepository.findByUserAndType.mockResolvedValue(
			addonSubscription({ addonFeaturesDisabledAt: new Date() }),
		);

		expect(await service.getCustomDomainLimit(USER_ID)).toEqual({
			baseLimit: 1,
			addonSlots: 0,
			effectiveLimit: 1,
		});
	});

	it('should never return a negative slot count', async () => {
		mockSubscriptionRepository.findByUserId.mockResolvedValue(proSubscription('active'));
		mockAddonRepository.findByUserAndType.mockResolvedValue(addonSubscription({ quantity: -2 }));

		expect(await service.getCustomDomainLimit(USER_ID)).toEqual({
			baseLimit: 1,
			addonSlots: 0,
			effectiveLimit: 1,
		});
	});
});
