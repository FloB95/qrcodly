import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import type Stripe from 'stripe';
import { type Logger } from '@/core/logging';
import type UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import type UserAddonSubscriptionRepository from '../../domain/repository/user-addon-subscription.repository';
import { type TUserSubscription } from '../../domain/entities/user-subscription.entity';
import { type TUserAddonSubscription } from '../../domain/entities/user-addon-subscription.entity';
import { type StripeService } from '../../service/stripe.service';
import { EndBillingOfDeletedUserUseCase } from '../end-billing-of-deleted-user.use-case';

const USER_ID = 'user_leaving';

const stripeSubscription = (id: string, status: Stripe.Subscription.Status) =>
	({ id, status, schedule: null }) as Stripe.Subscription;

describe('EndBillingOfDeletedUserUseCase', () => {
	let subscriptions: MockProxy<UserSubscriptionRepository>;
	let addons: MockProxy<UserAddonSubscriptionRepository>;
	let stripe: MockProxy<StripeService>;
	let useCase: EndBillingOfDeletedUserUseCase;

	const pro = { id: 'row-pro', userId: USER_ID, stripeCustomerId: 'cus_1' } as TUserSubscription;
	const addon = {
		id: 'row-addon',
		userId: USER_ID,
		stripeCustomerId: 'cus_1',
	} as TUserAddonSubscription;

	beforeEach(() => {
		subscriptions = mock<UserSubscriptionRepository>();
		addons = mock<UserAddonSubscriptionRepository>();
		stripe = mock<StripeService>();
		stripe.findCustomerIdsByUserId.mockResolvedValue([]);
		useCase = new EndBillingOfDeletedUserUseCase(subscriptions, addons, stripe, mock<Logger>());
	});

	it('cancels every running subscription of the customer once and removes our copies', async () => {
		subscriptions.findByUserId.mockResolvedValue(pro);
		addons.findAll.mockResolvedValue([addon]);
		stripe.findCustomerIdsByUserId.mockResolvedValue(['cus_1']);
		stripe.listSubscriptionsForCustomer.mockResolvedValue([
			stripeSubscription('sub_pro', 'active'),
			stripeSubscription('sub_addon', 'past_due'),
			stripeSubscription('sub_old', 'canceled'),
			stripeSubscription('sub_expired', 'incomplete_expired'),
		]);

		await useCase.execute(USER_ID);

		// both rows point at the same customer, which is asked only once
		expect(stripe.listSubscriptionsForCustomer).toHaveBeenCalledTimes(1);
		expect(stripe.cancelSubscriptionNow.mock.calls.map(([sub]) => sub.id)).toEqual([
			'sub_pro',
			'sub_addon',
		]);
		expect(addons.delete).toHaveBeenCalledWith(addon);
		expect(subscriptions.delete).toHaveBeenCalledWith(pro);
	});

	it('does nothing for a user who never paid', async () => {
		subscriptions.findByUserId.mockResolvedValue(undefined);
		addons.findAll.mockResolvedValue([]);

		await useCase.execute(USER_ID);

		expect(stripe.findCustomerIdsByUserId).toHaveBeenCalledWith(USER_ID);
		expect(stripe.listSubscriptionsForCustomer).not.toHaveBeenCalled();
		expect(subscriptions.delete).not.toHaveBeenCalled();
	});

	it('cancels a subscription whose webhook has not reached us yet', async () => {
		subscriptions.findByUserId.mockResolvedValue(undefined);
		addons.findAll.mockResolvedValue([]);
		stripe.findCustomerIdsByUserId.mockResolvedValue(['cus_fresh']);
		stripe.listSubscriptionsForCustomer.mockResolvedValue([
			stripeSubscription('sub_new', 'active'),
		]);

		await useCase.execute(USER_ID);

		expect(stripe.listSubscriptionsForCustomer).toHaveBeenCalledWith('cus_fresh');
		expect(stripe.cancelSubscriptionNow.mock.calls.map(([sub]) => sub.id)).toEqual(['sub_new']);
	});

	it('keeps our copies when Stripe fails, so a second run can still cancel', async () => {
		subscriptions.findByUserId.mockResolvedValue(pro);
		addons.findAll.mockResolvedValue([]);
		stripe.listSubscriptionsForCustomer.mockResolvedValue([
			stripeSubscription('sub_pro', 'active'),
		]);
		stripe.cancelSubscriptionNow.mockRejectedValue(new Error('Stripe down'));

		await expect(useCase.execute(USER_ID)).rejects.toThrow('Stripe down');

		expect(subscriptions.delete).not.toHaveBeenCalled();
	});
});
