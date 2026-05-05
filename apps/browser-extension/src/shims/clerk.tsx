// Re-export everything from @clerk/chrome-extension as a drop-in for @clerk/nextjs
import { Show, type ShowProps } from '@clerk/chrome-extension';
import type { ReactNode } from 'react';

export {
	ClerkProvider,
	SignIn,
	SignUp,
	SignInButton,
	SignUpButton,
	SignOutButton,
	UserButton,
	UserProfile,
	useAuth,
	useClerk,
	useUser,
	useSession,
	useSessionList,
	useSignIn,
	useSignUp,
	useOrganization,
	useOrganizationList,
} from '@clerk/chrome-extension';

// v3 of @clerk/chrome-extension removed <SignedIn> and <SignedOut> in favor of <Show when="...">.
// The frontend still uses these names (it's a Next.js app on @clerk/nextjs), so shim them.
export function SignedIn({ children }: { children: ReactNode }) {
	const props = { when: 'signed-in', children } as unknown as ShowProps;
	return <Show {...props} />;
}
export function SignedOut({ children }: { children: ReactNode }) {
	const props = { when: 'signed-out', children } as unknown as ShowProps;
	return <Show {...props} />;
}

// useReverification is not available in @clerk/chrome-extension — provide a no-op
export function useReverification() {
	return [
		async (fn: unknown) => {
			if (typeof fn === 'function') return fn();
		},
	] as const;
}

// Also re-export the UserAvatar-like components if they exist
export { UserButton as UserAvatar } from '@clerk/chrome-extension';
