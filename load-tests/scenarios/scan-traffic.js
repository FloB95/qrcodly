// =============================================================================
// Scan Traffic Simulation
//
// Simulates real users scanning QR codes and clicking short URLs.
// Hits the frontend /u/{shortCode} endpoint which triggers the full flow:
//   1. Resolve short URL (backend GET /short-url/{shortCode})
//   2. Umami analytics event
//   3. Clear views cache (backend POST)
//   4. Track scan with device/browser info (backend POST)
//   5. 302 Redirect to destination
//
// Short codes are provided via setupData (created dynamically in setup())
// or via SHORT_CODES env var as fallback.
// =============================================================================

import http from 'k6/http';
import encoding from 'k6/encoding';
import { check, sleep } from 'k6';
import { randomScanProfile, getScanHeaders } from '../data/user-agents.js';
import { randomItem, randomInt } from '../helpers.js';

// Frontend URL for scan simulation (goes through Next.js middleware)
const FRONTEND_URL = __ENV.FRONTEND_URL || '';

// HTAccess basic auth for staging frontend
const HTACCESS_USER = __ENV.HTACCESS_USER || '';
const HTACCESS_PASS = __ENV.HTACCESS_PASS || '';

/**
 * Simulate a single QR code scan / short URL click
 * with a unique browser fingerprint
 */
function performScan(shortCode) {
	const profile = randomScanProfile();
	const headers = getScanHeaders(profile);

	// Add HTAccess basic auth if configured
	if (HTACCESS_USER && HTACCESS_PASS) {
		headers['Authorization'] = `Basic ${encoding.b64encode(`${HTACCESS_USER}:${HTACCESS_PASS}`)}`;
	}

	// Hit the frontend /u/{shortCode} — this triggers the full tracking pipeline
	const res = http.get(`${FRONTEND_URL}/u/${shortCode}`, {
		headers,
		redirects: 0, // Don't follow the redirect — we just want to trigger tracking
		tags: { type: 'scan' },
	});

	check(res, {
		'Scan: redirect or success': (r) =>
			r.status === 200 ||
			r.status === 301 ||
			r.status === 302 ||
			r.status === 307 ||
			r.status === 308,
	});

	return res;
}

/**
 * Get available short codes from setupData or env var fallback
 */
function getShortCodes(setupData) {
	if (setupData && setupData.shortCodes && setupData.shortCodes.length > 0) {
		return setupData.shortCodes;
	}
	// Fallback to env var
	if (__ENV.SHORT_CODES) {
		return __ENV.SHORT_CODES.split(',').map((c) => c.trim());
	}
	return [];
}

/**
 * High-volume scan flow
 */
export function scanTrafficFlow(setupData) {
	const codes = getShortCodes(setupData);
	if (codes.length === 0) {
		sleep(5);
		return;
	}

	const shortCode = randomItem(codes);
	performScan(shortCode);

	// Simulate human delay between scans (0.5s to 3s)
	sleep(0.5 + Math.random() * 2.5);
}

/**
 * Burst scan flow — simulates a QR code going viral
 */
export function scanBurstFlow(setupData) {
	const codes = getShortCodes(setupData);
	if (codes.length === 0) {
		sleep(5);
		return;
	}

	const shortCode = randomItem(codes);

	const burstSize = randomInt(3, 8);
	for (let i = 0; i < burstSize; i++) {
		performScan(shortCode);
		sleep(0.1 + Math.random() * 0.5);
	}

	sleep(1);
}

export { performScan };
