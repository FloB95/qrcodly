// Re-export everything from @clerk/chrome-extension as a drop-in for @clerk/nextjs
export {
	ClerkProvider,
	SignIn,
	SignUp,
	SignedIn,
	SignedOut,
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
