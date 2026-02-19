interface ImportMetaEnv {
	readonly VITE_FRONTEND_URL: string;
	readonly VITE_API_URL: string;
	readonly VITE_CLERK_PUBLISHABLE_KEY: string;
	readonly VITE_POSTHOG_KEY: string;
	readonly VITE_POSTHOG_HOST: string;
	readonly VITE_SENTRY_DSN: string;
	readonly VITE_SENTRY_ENVIRONMENT: string;
	readonly VITE_UMAMI_WEBSITE: string;
	readonly VITE_CLERK_PRO_PLAN_ID: string;
	readonly VITE_GOOGLE_API_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
