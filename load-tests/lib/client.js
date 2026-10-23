// =============================================================================
// HTTP layer: every request goes through here so it is tagged consistently
// (route name, kind, load step) and checked against the production guards.
// =============================================================================

import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
	ABORT_LATENCY_MS,
	ABORT_STREAK,
	API_URL,
	FRONTEND_URL,
	PAGE_LOADS,
	resolvePlan,
} from '../config.js';
import { randomId } from '../data/random.js';

export const rateLimited = new Counter('rate_limited');
export const serverErrors = new Rate('server_errors');

// The report reads these instead of sub-metrics of http_req_*: sub-metrics that only get their
// first sample mid-run (a new step, a new endpoint) crash the charts of k6's web dashboard.
const apiDuration = new Trend('api_duration', true);
const pageDuration = new Trend('page_duration', true);
const endpointDuration = new Trend('endpoint_duration', true);
const requests = new Counter('requests');
const failedRequests = new Rate('failed_requests');

function measure(res, name, trend) {
	trend.add(res.timings.duration);
	endpointDuration.add(res.timings.duration, { name });
	requests.add(1);
	failedRequests.add(res.status === 0 || res.status >= 400);
}

const TIMEOUT = '30s';
const TOKEN_MARGIN_SECONDS = 60;
const HOLDS = resolvePlan().holds;

/** Tags everything this VU emits with the load step it is in ("ramp" between steps). */
function tagStep() {
	let label = 'ramp';
	try {
		const elapsed = (Date.now() - exec.scenario.startTime) / 1000;
		const hold = HOLDS.find((h) => elapsed >= h.start && elapsed < h.end);
		if (hold) label = hold.label;
	} catch (_) {
		label = 'setup';
	}
	exec.vu.metrics.tags.step = label;
}

function stop(reason) {
	console.error(`\n✋ ${reason}\n`);
	exec.test.abort(reason);
}

let failStreak = 0;
let slowStreak = 0;

function watchHealth(res, name) {
	const failed = res.status === 0 || res.status >= 500;
	serverErrors.add(failed);
	failStreak = failed ? failStreak + 1 : 0;
	slowStreak = res.timings.duration > ABORT_LATENCY_MS ? slowStreak + 1 : 0;

	if (failStreak >= ABORT_STREAK) {
		stop(
			`Circuit breaker: ${failStreak} failed requests in a row (last: ${name} → ` +
				`${res.status || res.error}). Production is failing for real users — stopping.`,
		);
	}
	if (slowStreak >= ABORT_STREAK) {
		stop(
			`Circuit breaker: ${slowStreak} requests in a row slower than ${ABORT_LATENCY_MS} ms ` +
				`(last: ${name}). Production is saturated — stopping.`,
		);
	}
}

function guardToken(user) {
	// An expired token means a 401, and 30 of those per hour get this IP blocked for 7 days.
	if (Date.now() / 1000 > user.exp - TOKEN_MARGIN_SECONDS) {
		stop('Test-user tokens are about to expire — mint longer-lived ones (TOKEN_TTL) and rerun.');
	}
}

function parse(res) {
	try {
		return res.json();
	} catch (_) {
		return undefined;
	}
}

function guardApi(res, name) {
	if (res.status === 429) rateLimited.add(1, { name });

	if (res.status === 401) {
		stop(
			`${name} returned 401. Stopping before the backend's IP-abuse tracker ` +
				'(30 × 401 per hour → 7-day IP block) locks this machine out.',
		);
	}
	if (res.status === 403) {
		const body = parse(res);
		if (body && body.message === 'Access denied') {
			stop(
				'The backend blocked this IP (ip-abuse tracker). Unblock via Redis: ' +
					'DEL ip_abuse:blocked:<your-ip> ip_abuse:attempts:<your-ip>',
			);
		}
		if (body && body.errorCode === 'ACCOUNT_BANNED') {
			stop(`${name}: a test user is banned — check privateMetadata.banned in Clerk.`);
		}
	}
}

function toQuery(query) {
	if (!query) return '';
	const parts = [];
	const add = (key, value) => {
		if (value === undefined || value === null) return;
		if (typeof value === 'object') {
			for (const k of Object.keys(value)) add(`${key}[${k}]`, value[k]);
			return;
		}
		parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
	};
	for (const key of Object.keys(query)) add(key, query[key]);
	return parts.length ? `?${parts.join('&')}` : '';
}

function apiRequest(user, method, path, name, { body, query, kind = 'api' } = {}) {
	const headers = {
		Authorization: `Bearer ${user.token}`,
		Accept: 'application/json',
		'Accept-Language': user.acceptLanguage,
	};
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	return {
		method,
		url: `${API_URL}${path}${toQuery(query)}`,
		body: body === undefined ? null : JSON.stringify(body),
		params: { headers, tags: { name, kind }, timeout: TIMEOUT },
	};
}

function inspect(res, name, expect, kind = 'api') {
	if (kind === 'api') measure(res, name, apiDuration);
	check(res, { [`${name} → ${expect}`]: (r) => r.status === expect });
	watchHealth(res, name);
	guardApi(res, name);
	return res;
}

/**
 * One API call. `name` is the route template ("GET /qr-code/:id") — never the raw URL,
 * or every ID becomes its own metric series.
 */
export function api(user, method, path, name, { body, query, expect = 200, kind = 'api' } = {}) {
	guardToken(user);
	if (kind === 'api') tagStep();
	const req = apiRequest(user, method, path, name, { body, query, kind });
	return inspect(http.request(req.method, req.url, req.body, req.params), name, expect, kind);
}

/** Parallel GETs — what a page fires on first render. `specs`: [{ path, query, name }]. */
export function apiBatch(user, specs) {
	guardToken(user);
	tagStep();
	const responses = http.batch(
		specs.map((s) => apiRequest(user, 'GET', s.path, s.name, { query: s.query })),
	);
	return responses.map((res, i) => inspect(res, specs[i].name, 200));
}

/** Parsed JSON body when the status matches, otherwise undefined. */
export function body(res, expect = 200) {
	return res && res.status === expect ? parse(res) : undefined;
}

// --- Next.js pages -------------------------------------------------------------

function localize(locale, path) {
	if (locale === 'en') return path;
	return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

function clerkCookies(user) {
	// What Clerk's middleware reads: the session JWT plus a client_uat not newer than its iat.
	return {
		__session: { value: user.token, replace: true },
		__client_uat: { value: String(user.iat), replace: true },
	};
}

/**
 * A page view. The first one of a visit is a full document load; later ones are
 * client-side navigations, i.e. RSC requests that render the route on the server.
 */
export function page(user, path, name, { document = false, kind = 'page' } = {}) {
	if (!PAGE_LOADS) return undefined;
	guardToken(user);
	if (kind === 'page') tagStep();

	const headers = document
		? {
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': user.acceptLanguage,
				'Sec-Fetch-Dest': 'document',
				'Sec-Fetch-Mode': 'navigate',
				'Sec-Fetch-Site': 'same-origin',
				'Upgrade-Insecure-Requests': '1',
			}
		: { Accept: '*/*', 'Accept-Language': user.acceptLanguage, RSC: '1' };
	const url = `${FRONTEND_URL}${localize(user.locale, path)}${document ? '' : `?_rsc=${randomId(5)}`}`;
	const tagName = `${document ? 'DOC' : 'RSC'} ${name}`;

	const res = http.get(url, {
		headers,
		cookies: clerkCookies(user),
		redirects: 0,
		responseType: 'none',
		timeout: TIMEOUT,
		tags: { name: tagName, kind },
	});

	if (kind === 'page') measure(res, tagName, pageDuration);
	check(res, { [`${tagName} → 200`]: (r) => r.status === 200 });
	watchHealth(res, tagName);

	if (res.headers['Cf-Mitigated']) {
		stop(
			'Cloudflare is challenging the load generator, so page-load results would be ' +
				'meaningless. Rerun with PAGE_LOADS=0 or see "Cloudflare" in the README.',
		);
	}
	const location = res.headers.Location || '';
	if (res.status >= 300 && res.status < 400 && /sign-in|handshake|clerk\./.test(location)) {
		stop(`The frontend did not accept the session cookie (${tagName} → ${location}).`);
	}
	return res;
}

// --- public scans ------------------------------------------------------------

export function scan(url, headers) {
	const res = http.get(url, {
		headers,
		redirects: 0,
		responseType: 'none',
		timeout: TIMEOUT,
		tags: { name: 'GET /u/:code', kind: 'scan' },
	});
	check(res, { 'scan → redirect': (r) => r.status >= 300 && r.status < 400 });
	watchHealth(res, 'GET /u/:code');
	if (res.headers['Cf-Mitigated']) stop('Cloudflare is challenging the scan traffic.');
	return res;
}
