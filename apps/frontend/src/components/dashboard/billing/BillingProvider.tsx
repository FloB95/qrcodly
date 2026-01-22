'use client';

import { PaymentElementProvider } from '@clerk/nextjs/experimental';
import type { ReactNode } from 'react';

interface BillingProviderProps {
	children: ReactNode;
}

export function BillingProvider({ children }: BillingProviderProps) {
	return <PaymentElementProvider for="user">{children}</PaymentElementProvider>;
}
