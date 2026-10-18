import { env } from '@/env';

/** Backend base URL for calls made by the Next.js server (never the browser). */
export function serverApiUrl(): string {
	return env.API_INTERNAL_URL ?? env.NEXT_PUBLIC_API_URL;
}
