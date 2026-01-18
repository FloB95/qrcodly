import type {
	usePaymentAttempts,
	usePaymentMethods,
	useSubscription,
} from '@clerk/nextjs/experimental';

export type Payment = NonNullable<ReturnType<typeof usePaymentAttempts>['data']>[number];
export type PaymentMethod = NonNullable<ReturnType<typeof usePaymentMethods>['data']>[number];
export type SubscriptionItem = NonNullable<
	ReturnType<typeof useSubscription>['data']
>['subscriptionItems'][number];
