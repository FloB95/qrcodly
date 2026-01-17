import type { usePaymentAttempts, usePaymentMethods } from '@clerk/nextjs/experimental';

export type Payment = NonNullable<ReturnType<typeof usePaymentAttempts>['data']>[number];
export type PaymentMethod = NonNullable<ReturnType<typeof usePaymentMethods>['data']>[number];
