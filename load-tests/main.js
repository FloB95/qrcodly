// =============================================================================
// k6 Load Test — QRcodly Full User Flow
//
// Usage:
//   ./run.sh               # smoke test
//   ./run.sh medium        # 250 VUs
//   ./run.sh heavy         # 1000 VUs
//
// Profiles: smoke | light | medium | heavy | spike
// Modes:    full (default) | scan-only
// =============================================================================

import http from 'k6/http';
import {
	PROFILES,
	THRESHOLDS,
	BASE_URL,
	CLERK_TOKENS,
	CLERK_SECRET_KEY,
	CLERK_API,
	JWT_TEMPLATE,
	USER_IDS,
} from './config.js';
import { qrCodeCrudFlow, qrCodeReadFlow } from './scenarios/qr-codes.js';
import { shortUrlCrudFlow } from './scenarios/short-urls.js';
import { configTemplateCrudFlow, tagCrudFlow } from './scenarios/templates-tags.js';
import { scanTrafficFlow, scanBurstFlow } from './scenarios/scan-traffic.js';
import { randomItem, getHeaders } from './helpers.js';
import { createUrlQrCode, createShortUrlPayload } from './data/payloads.js';
import { initAuth } from './auth.js';

// --- k6 Options ---
const profileName = __ENV.PROFILE || 'smoke';
const profile = PROFILES[profileName] || PROFILES.smoke;
const mode = __ENV.MODE || 'full';

export const options = {
	stages: profile.stages,
	thresholds: {
		...THRESHOLDS,
		'http_req_duration{type:scan}': ['p(95)<1500'],
	},
	insecureSkipTLSVerify: true,
	tags: { testProfile: profileName },
};

// --- How many test resources to create in setup ---
const SETUP_QR_CODES = 5;
const SETUP_SHORT_URLS = 5;

// =============================================================================
// setup() — runs ONCE before all VUs
// Creates Clerk sessions, QR codes + short URLs
// =============================================================================
export function setup() {
	const data = {
		shortCodes: [],
		createdQrCodeIds: [],
		createdShortCodes: [],
		sessionIds: [], // Clerk session IDs for token refresh
	};

	if (CLERK_TOKENS.length === 0) {
		console.log('No CLERK_TOKENS — skipping test data creation.');
		if (__ENV.SHORT_CODES) {
			data.shortCodes = __ENV.SHORT_CODES.split(',').map((c) => c.trim());
		}
		return data;
	}

	// 1. Create persistent Clerk sessions for each user (for token refresh)
	if (CLERK_SECRET_KEY && USER_IDS.length > 0) {
		console.log(`Creating Clerk sessions for ${USER_IDS.length} users...`);
		const clerkHeaders = {
			Authorization: `Bearer ${CLERK_SECRET_KEY}`,
			'Content-Type': 'application/json',
		};

		for (const userId of USER_IDS) {
			const res = http.post(`${CLERK_API}/sessions`, JSON.stringify({ user_id: userId }), {
				headers: clerkHeaders,
				tags: { type: 'setup' },
			});

			if (res.status === 200) {
				try {
					const session = JSON.parse(res.body);
					data.sessionIds.push(session.id);
					console.log(`  ✓ Session for ${userId}: ${session.id}`);
				} catch {
					data.sessionIds.push(null);
				}
			} else {
				console.warn(`  ✗ Session for ${userId}: status=${res.status}`);
				data.sessionIds.push(null);
			}
		}
		console.log('');
	}

	const token = CLERK_TOKENS[0];
	const headers = getHeaders(token);

	// 2. Create dynamic QR codes (isEditable: true → generates a short URL)
	console.log(`Creating ${SETUP_QR_CODES} dynamic QR codes...`);
	for (let i = 0; i < SETUP_QR_CODES; i++) {
		const payload = createUrlQrCode();
		payload.content.data.isEditable = true;

		const res = http.post(`${BASE_URL}/qr-code`, JSON.stringify(payload), {
			headers,
			tags: { type: 'setup' },
		});

		if (res.status === 200 || res.status === 201) {
			try {
				const qr = JSON.parse(res.body);
				data.createdQrCodeIds.push(qr.id);
				if (qr.shortUrl && qr.shortUrl.shortCode) {
					data.shortCodes.push(qr.shortUrl.shortCode);
					console.log(`  ✓ QR code ${i + 1}: shortCode=${qr.shortUrl.shortCode}`);
				}
			} catch {
				console.warn(`  ✗ QR code ${i + 1}: failed to parse response`);
			}
		} else {
			console.warn(`  ✗ QR code ${i + 1}: status=${res.status}`);
		}
	}

	// 3. Create standalone short URLs
	console.log(`Creating ${SETUP_SHORT_URLS} standalone short URLs...`);
	for (let i = 0; i < SETUP_SHORT_URLS; i++) {
		const payload = createShortUrlPayload();

		const res = http.post(`${BASE_URL}/short-url`, JSON.stringify(payload), {
			headers,
			tags: { type: 'setup' },
		});

		if (res.status === 200 || res.status === 201) {
			try {
				const url = JSON.parse(res.body);
				data.createdShortCodes.push(url.shortCode);
				data.shortCodes.push(url.shortCode);
				console.log(`  ✓ Short URL ${i + 1}: shortCode=${url.shortCode}`);
			} catch {
				console.warn(`  ✗ Short URL ${i + 1}: failed to parse response`);
			}
		} else {
			console.warn(`  ✗ Short URL ${i + 1}: status=${res.status}`);
		}
	}

	// 4. Add manually specified short codes from env
	if (__ENV.SHORT_CODES) {
		const envCodes = __ENV.SHORT_CODES.split(',').map((c) => c.trim());
		data.shortCodes.push(...envCodes);
	}

	console.log('');
	console.log(
		`Setup complete: ${data.shortCodes.length} short codes, ${data.sessionIds.length} sessions`,
	);
	console.log('');

	return data;
}

// =============================================================================
// teardown() — runs ONCE after all VUs finish
// =============================================================================
export function teardown(data) {
	if (CLERK_TOKENS.length === 0) return;

	const token = CLERK_TOKENS[0];
	const headers = getHeaders(token);

	console.log('Cleaning up test data...');

	for (const id of data.createdQrCodeIds) {
		http.del(`${BASE_URL}/qr-code/${id}`, null, { headers, tags: { type: 'teardown' } });
	}

	for (const shortCode of data.createdShortCodes) {
		http.del(`${BASE_URL}/short-url/${shortCode}`, null, {
			headers,
			tags: { type: 'teardown' },
		});
	}

	console.log(
		`Cleaned up ${data.createdQrCodeIds.length} QR codes + ${data.createdShortCodes.length} short URLs`,
	);
}

// =============================================================================
// Scenario Distribution
// =============================================================================

const SCENARIO_FLOWS = {
	qrCrud: qrCodeCrudFlow,
	qrRead: qrCodeReadFlow,
	shortUrlCrud: shortUrlCrudFlow,
	templateCrud: configTemplateCrudFlow,
	tagCrud: tagCrudFlow,
	scan: scanTrafficFlow,
	scanBurst: scanBurstFlow,
};

const SCAN_ONLY_WEIGHTS = { scan: 80, scanBurst: 20 };
const FULL_WEIGHTS = {
	qrCrud: 25,
	qrRead: 10,
	shortUrlCrud: 10,
	templateCrud: 5,
	tagCrud: 5,
	scan: 35,
	scanBurst: 10,
};

function buildPool(weights) {
	const pool = [];
	for (const [scenario, weight] of Object.entries(weights)) {
		for (let i = 0; i < weight; i++) pool.push(scenario);
	}
	return pool;
}

const hasTokens = CLERK_TOKENS.length > 0;
const pool =
	mode === 'scan-only' || !hasTokens
		? buildPool(SCAN_ONLY_WEIGHTS)
		: buildPool(FULL_WEIGHTS);

// --- Main VU Function ---
export default function (setupData) {
	initAuth(setupData);

	const scenario = randomItem(pool);
	SCENARIO_FLOWS[scenario](setupData);
}
