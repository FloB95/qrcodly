// No-op shim for @clerk/nextjs/experimental — experimental features not available in chrome extension.
// These are Clerk billing features that aren't used in the extension context.

export function useSubscription() {
	return { subscription: null, isLoaded: true };
}

export function usePaymentMethods() {
	return { paymentMethods: [], isLoaded: true };
}

export function usePaymentElement() {
	return { paymentElement: null, isLoaded: true };
}

export function usePaymentAttempts() {
	return { paymentAttempts: [], isLoaded: true };
}

export function useAPIKeys() {
	return { apiKeys: [], isLoaded: true };
}

export function PaymentElement() {
	return null;
}

export function PaymentElementProvider({ children }: { children: React.ReactNode }) {
	return children;
}

export function CheckoutButton() {
	return null;
}
