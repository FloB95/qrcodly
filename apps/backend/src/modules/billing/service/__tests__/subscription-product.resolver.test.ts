import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import type Stripe from 'stripe';
import { SubscriptionProductResolver } from '../subscription-product.resolver';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import type UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';
import { env } from '@/core/config/env';

const PRO_PRICE_ID = env.STRIPE_PRO_PRICE_ID_MONTHLY;
const ADDON_PRICE_ID = env.STRIPE_ADDON_DOMAIN_PRICE_ID_MONTHLY;

const subscription = (
	priceId: string | undefined,
	metadata: Record<string, string> = {},
): Stripe.Subscription =>
	({
		id: 'sub_test',
		metadata,
		items: { data: priceId ? [{ price: { id: priceId } }] : [] },
	}) as unknown as Stripe.Subscription;

describe('SubscriptionProductResolver', () => {
	let resolver: SubscriptionProductResolver;
	let mockSubscriptionRepository: MockProxy<UserSubscriptionRepository>;
	let mockAddonRepository: MockProxy<UserAddonSubscriptionRepository>;

	beforeEach(() => {
		mockSubscriptionRepository = mock<UserSubscriptionRepository>();
		mockAddonRepository = mock<UserAddonSubscriptionRepository>();
		resolver = new SubscriptionProductResolver(mockSubscriptionRepository, mockAddonRepository);

		mockSubscriptionRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);
		mockAddonRepository.findByStripeSubscriptionId.mockResolvedValue(undefined);
	});

	it('should resolve by price id without touching the database', async () => {
		expect(await resolver.resolveFromSubscription(subscription(PRO_PRICE_ID))).toBe('pro');
		expect(await resolver.resolveFromSubscription(subscription(ADDON_PRICE_ID))).toBe(
			'domain_addon',
		);
		expect(mockAddonRepository.findByStripeSubscriptionId).not.toHaveBeenCalled();
		expect(mockSubscriptionRepository.findByStripeSubscriptionId).not.toHaveBeenCalled();
	});

	it('should let the price id win over contradicting metadata', async () => {
		const sub = subscription(PRO_PRICE_ID, { product: 'domain_addon' });

		expect(await resolver.resolveFromSubscription(sub)).toBe('pro');
	});

	it('should fall back to metadata for an unknown price', async () => {
		const sub = subscription('price_legacy', { product: 'domain_addon' });

		expect(await resolver.resolveFromSubscription(sub)).toBe('domain_addon');
	});

	it('should fall back to the local add-on record', async () => {
		mockAddonRepository.findByStripeSubscriptionId.mockResolvedValue({} as never);

		expect(await resolver.resolveFromSubscription(subscription('price_legacy'))).toBe(
			'domain_addon',
		);
	});

	it('should fall back to the local Pro record', async () => {
		mockSubscriptionRepository.findByStripeSubscriptionId.mockResolvedValue({} as never);

		expect(await resolver.resolveFromSubscription(subscription('price_legacy'))).toBe('pro');
	});

	it('should return unknown when nothing identifies the subscription', async () => {
		expect(await resolver.resolveFromSubscription(subscription(undefined))).toBe('unknown');
	});
});
