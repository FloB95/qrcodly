import { env } from '@/core/config/env';

/**
 * Checkout success/cancel URLs must point back at our own frontend.
 *
 * Shared by every checkout endpoint on purpose — a second, drifting copy of this check is how
 * an open redirect gets introduced.
 */
export function isAllowedRedirect(url?: string): boolean {
	if (!url) return true;
	try {
		return new URL(url).origin === new URL(env.FRONTEND_URL).origin;
	} catch {
		return false;
	}
}
