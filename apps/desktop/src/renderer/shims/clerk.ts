// Re-export everything from @clerk/clerk-react as a drop-in for @clerk/nextjs
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
	useReverification,
} from '@clerk/clerk-react';

// Also re-export the UserAvatar-like components if they exist
export { UserButton as UserAvatar } from '@clerk/clerk-react';
