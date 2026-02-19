// Shim for @/env — replaces @t3-oss/env-nextjs with plain Vite env vars
export const env = {
	NEXT_PUBLIC_FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL ?? 'https://www.qrcodly.de',
	NEXT_PUBLIC_API_URL: import.meta.env.VITE_API_URL ?? 'https://api.qrcodly.de',
	NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '',
	NEXT_PUBLIC_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY ?? '',
	NEXT_PUBLIC_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST ?? '',
	NEXT_PUBLIC_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN ?? '',
	NEXT_PUBLIC_SENTRY_ENVIRONMENT: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? 'desktop',
	NEXT_PUBLIC_UMAMI_WEBSITE: import.meta.env.VITE_UMAMI_WEBSITE ?? '',
	NEXT_PUBLIC_CLERK_PRO_PLAN_ID: import.meta.env.VITE_CLERK_PRO_PLAN_ID ?? '',
	NEXT_PUBLIC_GOOGLE_API_KEY: import.meta.env.VITE_GOOGLE_API_KEY ?? '',
};
