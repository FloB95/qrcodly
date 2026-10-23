// =============================================================================
// Target, knobs and load profiles. Everything is overridable via `-e KEY=value`
// (run.sh forwards the matching variables from .env).
// =============================================================================

const env = (key, fallback) =>
	__ENV[key] !== undefined && __ENV[key] !== '' ? __ENV[key] : fallback;
const trimSlash = (url) => url.replace(/\/+$/, '');

export const RUN_ID = env('RUN_ID', 'local');
export const API_URL = trimSlash(env('API_URL', 'https://api.qrcodly.de/api/v1'));
export const FRONTEND_URL = trimSlash(env('FRONTEND_URL', 'https://www.qrcodly.de'));
export const SCAN_URL = trimSlash(env('SCAN_URL', FRONTEND_URL));
export const TOKENS_FILE = env('TOKENS_FILE', './.state/tokens.json');
export const RESULTS_DIR = env('RESULTS_DIR', './results');

/** Multiplies every think time. 0.5 = users click twice as fast. */
export const THINK = Number(env('THINK', 1));
/** Render the Next.js pages a user navigates to. 0 = API calls only. */
export const PAGE_LOADS = env('PAGE_LOADS', '1') !== '0';
/** Public QR scans per second through /u/<code>. 0 = off. */
export const SCAN_RATE = Number(env('SCAN_RATE', 0));
/**
 * Short codes are never freed, not even by deleting the link. Each VU may mint at most this
 * many per run (dynamic QR codes, new or duplicated links); afterwards it only creates static
 * QR codes and works with the links it already has.
 */
export const NEW_CODES_PER_USER = Number(env('NEW_CODES_PER_USER', 2));
/** Unique destination URLs cost one Google Web Risk lookup each; the pool is cached for 5 min. */
export const UNIQUE_URLS = env('UNIQUE_URLS', '0') === '1';

// Service levels a step must meet to count as "handled" in the capacity report.
export const SLO_API_P95_MS = Number(env('SLO_API_P95_MS', 800));
export const SLO_PAGE_P95_MS = Number(env('SLO_PAGE_P95_MS', 2500));
export const SLO_ERROR_RATE = Number(env('SLO_ERROR_RATE', 0.01));

// Circuit breaker: one VU seeing this many failed (5xx/timeout) or extremely slow requests
// in a row means production is down for real users too, so the whole test stops.
export const ABORT_STREAK = Number(env('ABORT_STREAK', 10));
export const ABORT_LATENCY_MS = Number(env('ABORT_LATENCY_MS', 20000));

// --- Load profiles -----------------------------------------------------------

function seconds(value) {
	if (typeof value === 'number') return value;
	let total = 0;
	const re = /(\d+(?:\.\d+)?)\s*(h|m|s)/g;
	let match;
	while ((match = re.exec(value)) !== null) {
		total += Number(match[1]) * { h: 3600, m: 60, s: 1 }[match[2]];
	}
	return total || Number(value) || 0;
}

/** Ramp to each level, then hold it; only the hold phases are evaluated per step. */
function staircase(levels, ramp, hold) {
	const stages = [];
	const holds = [];
	let t = 0;
	for (const users of levels) {
		stages.push({ duration: `${ramp}s`, target: users });
		t += ramp;
		stages.push({ duration: `${hold}s`, target: users });
		holds.push({ label: String(users), users, start: t, end: t + hold });
		t += hold;
	}
	stages.push({ duration: '60s', target: 0 });
	return { stages, holds, seconds: t + 60 };
}

function spike(base, peak, hold) {
	const phases = [
		{ label: 'before', users: base, ramp: 60 },
		{ label: 'spike', users: peak, ramp: 30 },
		{ label: 'after', users: base, ramp: 30 },
	];
	const stages = [];
	const holds = [];
	let t = 0;
	for (const phase of phases) {
		stages.push({ duration: `${phase.ramp}s`, target: phase.users });
		t += phase.ramp;
		stages.push({ duration: `${hold}s`, target: phase.users });
		holds.push({ label: phase.label, users: phase.users, start: t, end: t + hold });
		t += hold;
	}
	stages.push({ duration: '30s', target: 0 });
	return { stages, holds, seconds: t + 30 };
}

export const PROFILE = env('PROFILE', 'smoke');

/** Resolves the active profile into k6 stages plus the hold windows used for step tagging. */
export function resolvePlan() {
	const users = Number(env('USERS', 0));
	const ramp = (fallback) => seconds(env('RAMP', fallback));
	const hold = (fallback) => seconds(env('HOLD', fallback));

	switch (PROFILE) {
		case 'smoke':
			return staircase([users || 3], ramp('15s'), hold('2m'));
		case 'baseline':
			return staircase([users || 25], ramp('1m'), hold('10m'));
		case 'load':
			return staircase([users || 200], ramp('5m'), hold('15m'));
		case 'soak':
			return staircase([users || 300], ramp('5m'), hold('60m'));
		case 'spike': {
			const peak = users || 500;
			return spike(Math.max(5, Math.round(peak / 10)), peak, hold('3m'));
		}
		case 'stress': {
			const max = users || 1000;
			const levels = env('STEPS', '')
				? env('STEPS', '')
						.split(',')
						.map((n) => Number(n.trim()))
						.filter((n) => n > 0)
				: [0.1, 0.25, 0.5, 0.75, 1].map((f) => Math.max(1, Math.round(max * f)));
			return staircase(levels, ramp('2m'), hold('5m'));
		}
		default:
			throw new Error(`Unknown PROFILE "${PROFILE}" (smoke|baseline|load|stress|spike|soak)`);
	}
}

// --- k6 options --------------------------------------------------------------

export const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ' +
	`Chrome/140.0.0.0 Safari/537.36 qrcodly-loadtest/${RUN_ID}`;

export const SUMMARY_TREND_STATS = ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'];

// Broken out individually in the report, to show which screen or endpoint gives first.
export const KEY_ENDPOINTS = [
	'DOC /dashboard/qr-codes',
	'RSC /dashboard/qr-codes',
	'RSC /dashboard/qr-codes/:id',
	'RSC /dashboard/qr-codes/:id/edit',
	'RSC / (generator)',
	'RSC /dashboard/short-urls',
	'RSC /dashboard/short-urls/:code',
	'GET /qr-code',
	'GET /qr-code (sidebar count)',
	'POST /qr-code',
	'PATCH /qr-code/:id',
	'DELETE /qr-code/:id',
	'POST /qr-code/:id/duplicate',
	'GET /short-url',
	'POST /short-url',
	'GET /short-url/:code/get-views',
	'GET /short-url/:code/analytics',
	'GET /short-url/reserved',
	'GET /tag (sidebar)',
	'POST /tag',
	'POST /config-template',
	'GET /billing/subscription',
	'GET /u/:code',
];

function thresholds(holds) {
	const t = {
		// pass/fail criteria for the run as a whole
		failed_requests: [`rate<${SLO_ERROR_RATE}`],
		api_duration: [`p(95)<${SLO_API_P95_MS}`],
		page_duration: [`p(95)<${SLO_PAGE_P95_MS}`],
		checks: ['rate>0.99'],
		// normal users never hit the per-user rate limits — if they do, the model is off
		rate_limited: ['count<1'],
	};
	// Always-true thresholds so k6 keeps these sub-metrics for the capacity report.
	for (const name of KEY_ENDPOINTS) t[`endpoint_duration{name:${name}}`] = ['max>=0'];
	for (const { label } of holds) {
		t[`api_duration{step:${label}}`] = ['max>=0'];
		t[`page_duration{step:${label}}`] = ['max>=0'];
		t[`requests{step:${label}}`] = ['count>=0'];
		t[`failed_requests{step:${label}}`] = ['rate>=0'];
		t[`rate_limited{step:${label}}`] = ['count>=0'];
	}
	return t;
}

export function buildOptions() {
	const plan = resolvePlan();
	const scenarios = {
		users: {
			executor: 'ramping-vus',
			exec: 'users',
			startVUs: 0,
			stages: plan.stages,
			gracefulRampDown: '30s',
			gracefulStop: '30s',
		},
	};
	if (SCAN_RATE > 0) {
		// A scan takes well under a second; every VU id also claims a test user, so keep this small.
		scenarios.scans = {
			executor: 'constant-arrival-rate',
			exec: 'scans',
			rate: SCAN_RATE,
			timeUnit: '1s',
			duration: `${plan.seconds}s`,
			preAllocatedVUs: Math.ceil(SCAN_RATE) + 1,
			maxVUs: Math.ceil(SCAN_RATE * 3) + 2,
		};
	}
	return {
		scenarios,
		thresholds: thresholds(plan.holds),
		summaryTrendStats: SUMMARY_TREND_STATS,
		userAgent: USER_AGENT,
		setupTimeout: '5m',
	};
}
