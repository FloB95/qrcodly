// =============================================================================
// Clerk Auth Token Management for k6
//
// Strategy:
//   - setup() creates one Clerk session per user and passes session IDs to VUs
//   - VUs reuse these sessions to get fresh JWTs (1 API call, not 2)
//   - Random jitter prevents thundering herd on token refresh
//   - On 429 (rate limit), VU backs off and keeps using the old token
// =============================================================================

import http from 'k6/http';
import encoding from 'k6/encoding';
import { CLERK_TOKENS, CLERK_SECRET_KEY, CLERK_API, JWT_TEMPLATE } from './config.js';

// Per-VU token state
const vuState = {
	token: null,
	sessionId: null,
	expiresAt: 0,
	refreshJitter: Math.random() * 15_000, // 0-15s random offset per VU
	backoffUntil: 0,
};

/**
 * Decode JWT payload to read expiry
 */
function decodeJwtPayload(jwt) {
	try {
		const parts = jwt.split('.');
		if (parts.length !== 3) return null;

		let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		while (payload.length % 4 !== 0) payload += '=';

		const decoded = String.fromCharCode(...new Uint8Array(encoding.b64decode(payload, 'std', 's')));
		return JSON.parse(decoded);
	} catch {
		return null;
	}
}

/**
 * Get token expiry time in ms
 */
function getTokenExpiry(token) {
	const payload = decodeJwtPayload(token);
	if (payload && payload.exp) {
		return payload.exp * 1000;
	}
	return Date.now() + 60_000;
}

/**
 * Get a fresh JWT from an existing Clerk session (single API call)
 */
function refreshTokenFromSession(sessionId) {
	if (!CLERK_SECRET_KEY || !sessionId) return null;

	const res = http.post(`${CLERK_API}/sessions/${sessionId}/tokens/${JWT_TEMPLATE}`, '{}', {
		headers: {
			Authorization: `Bearer ${CLERK_SECRET_KEY}`,
			'Content-Type': 'application/json',
		},
		tags: { type: 'auth_refresh' },
	});

	if (res.status === 429) {
		// Rate limited — back off for 30-60s
		vuState.backoffUntil = Date.now() + 30_000 + Math.random() * 30_000;
		return null;
	}

	if (res.status !== 200) {
		return null;
	}

	try {
		const data = JSON.parse(res.body);
		return data.jwt;
	} catch {
		return null;
	}
}

/**
 * Initialize auth state from setupData.
 * Call once at the start of each VU iteration.
 */
export function initAuth(setupData) {
	if (vuState.token) return; // Already initialized

	if (CLERK_TOKENS.length === 0) return;

	const idx = __VU % CLERK_TOKENS.length;
	vuState.token = CLERK_TOKENS[idx];
	vuState.expiresAt = getTokenExpiry(vuState.token);

	// Get session ID from setupData (created in setup())
	if (setupData && setupData.sessionIds && setupData.sessionIds[idx]) {
		vuState.sessionId = setupData.sessionIds[idx];
	}
}

/**
 * Get a valid token for the current VU.
 * Automatically refreshes from the existing session when near expiry.
 * Requires initAuth(setupData) to be called once before (in main default function).
 */
export function getValidToken() {
	if (!vuState.token) return null;

	const now = Date.now();

	// Still in backoff period — use existing token
	if (now < vuState.backoffUntil) {
		return vuState.token;
	}

	// Check if token needs refresh (with per-VU jitter to spread out calls)
	const refreshAt = vuState.expiresAt - 5_000 - vuState.refreshJitter;
	if (now >= refreshAt && vuState.sessionId) {
		const newToken = refreshTokenFromSession(vuState.sessionId);
		if (newToken) {
			vuState.token = newToken;
			vuState.expiresAt = getTokenExpiry(newToken);
		}
		// If refresh fails, keep using old token
	}

	return vuState.token;
}
