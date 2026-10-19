// =============================================================================
// setup(): refuse to start unless a few test users demonstrably work against
// the API and the frontend. A broken token would otherwise turn into a burst of
// 401s from every VU — and 30 of those get this IP blocked for 7 days.
// =============================================================================

import exec from 'k6/execution';
import { PAGE_LOADS, SCAN_RATE, resolvePlan } from '../config.js';
import { api, body, page } from './client.js';
import { earliestTokenExpiry, userAt, userCount } from './session.js';

function abort(reason) {
	console.error(`\n✋ ${reason}\n`);
	exec.test.abort(reason);
}

function collectScanCodes(count) {
	const codes = [];
	for (let i = 0; i < Math.min(count, 20); i++) {
		const user = userAt(i);
		const qrCodes = body(
			api(user, 'GET', '/qr-code', 'setup GET /qr-code', {
				query: { page: 1, limit: 100, contentType: 'url' },
				kind: 'setup',
			}),
		);
		for (const qrCode of (qrCodes && qrCodes.data) || []) {
			const link = qrCode.shortUrl;
			if (link && link.isActive && link.destinationUrl) codes.push(link.shortCode);
		}
		const shortUrls = body(
			api(user, 'GET', '/short-url', 'setup GET /short-url', {
				query: { page: 1, limit: 100, standalone: true },
				kind: 'setup',
			}),
		);
		for (const link of (shortUrls && shortUrls.data) || []) {
			if (link.isActive && link.destinationUrl) codes.push(link.shortCode);
		}
	}
	if (!codes.length) {
		console.warn('SCAN_RATE is set, but the test users own no active links — run ./run.sh seed.');
	}
	return codes;
}

export function preflight() {
	const count = userCount();
	if (!count) abort('No test-user tokens loaded — start the test via ./run.sh');

	const runEndsAt = Date.now() / 1000 + resolvePlan().seconds + 300;
	if (earliestTokenExpiry() < runEndsAt) {
		abort('The test-user tokens expire before this run ends — mint them with a longer TTL.');
	}

	const probes = [...new Set([0, Math.floor(count / 2), count - 1])];
	for (const index of probes) {
		const user = userAt(index);
		const res = api(user, 'GET', '/qr-code', 'preflight GET /qr-code', {
			query: { page: 1, limit: 1 },
			kind: 'setup',
		});
		if (res.status !== 200) {
			abort(`Preflight: the API answered ${res.status} for test user #${index + 1}.`);
		}
		if (PAGE_LOADS) {
			const doc = page(user, '/dashboard/qr-codes', 'preflight /dashboard/qr-codes', {
				document: true,
				kind: 'setup',
			});
			if (doc.status !== 200) {
				abort(
					`Preflight: the frontend answered ${doc.status} for test user #${index + 1} ` +
						'(expected the dashboard). Run with PAGE_LOADS=0 to test the API alone.',
				);
			}
		}
	}

	return { scanCodes: SCAN_RATE > 0 ? collectScanCodes(count) : [] };
}
