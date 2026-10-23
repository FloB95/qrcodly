// =============================================================================
// End-of-test report: one row per load step (hold phase only, ramps excluded)
// and the verdict "how many concurrent users stay within the SLOs".
// =============================================================================

import {
	API_URL,
	FRONTEND_URL,
	KEY_ENDPOINTS,
	PAGE_LOADS,
	PROFILE,
	RESULTS_DIR,
	RUN_ID,
	SLO_API_P95_MS,
	SLO_ERROR_RATE,
	SLO_PAGE_P95_MS,
	resolvePlan,
} from '../config.js';

const ms = (v) =>
	v === undefined || v === null
		? '—'
		: v >= 1000
			? `${(v / 1000).toFixed(2)}s`
			: `${Math.round(v)}ms`;
const pct = (v) => (v === undefined ? '—' : `${(v * 100).toFixed(2)}%`);
const cols = (values, widths) =>
	values.map((v, i) => (i === 0 ? String(v).padEnd(widths[i]) : String(v).padStart(widths[i])));

function metric(data, name) {
	const m = data.metrics[name];
	return m ? m.values : undefined;
}

function evaluate(data, hold, runSeconds) {
	const reqs = metric(data, `requests{step:${hold.label}}`);
	const api = metric(data, `api_duration{step:${hold.label}}`);
	const page = metric(data, `page_duration{step:${hold.label}}`);
	const failed = metric(data, `failed_requests{step:${hold.label}}`);
	const limited = metric(data, `rate_limited{step:${hold.label}}`);

	const count = reqs ? reqs.count : 0;
	const partial = hold.end > runSeconds;
	const seconds = Math.max(1, (partial ? runSeconds : hold.end) - hold.start);
	const row = {
		hold,
		count,
		partial,
		reached: count > 0,
		rps: count / seconds,
		api,
		page,
		errorRate: failed ? failed.rate : 0,
		limited: limited ? limited.count : 0,
		problems: [],
	};
	if (!row.reached) return row;

	if (api && api['p(95)'] > SLO_API_P95_MS) {
		row.problems.push(`API p95 ${ms(api['p(95)'])} > ${ms(SLO_API_P95_MS)}`);
	}
	if (PAGE_LOADS && page && page['p(95)'] > SLO_PAGE_P95_MS) {
		row.problems.push(`page p95 ${ms(page['p(95)'])} > ${ms(SLO_PAGE_P95_MS)}`);
	}
	if (row.errorRate >= SLO_ERROR_RATE) row.problems.push(`errors ${pct(row.errorRate)}`);
	if (row.limited > 0) row.problems.push(`${row.limited}× HTTP 429`);
	return row;
}

function stepTable(rows) {
	const widths = [18, 8, 9, 9, 9, 10, 8, 6];
	const lines = [
		cols(
			['Concurrent users', 'req/s', 'API p50', 'API p95', 'API p99', 'Page p95', 'Errors', '429'],
			widths,
		).join(' '),
	];
	for (const row of rows) {
		const users =
			row.hold.label === String(row.hold.users)
				? row.hold.users
				: `${row.hold.users} (${row.hold.label})`;
		if (!row.reached) {
			lines.push(`${String(users).padEnd(widths[0])} not reached`);
			continue;
		}
		const verdict = row.problems.length ? `✗ ${row.problems.join(', ')}` : '✓';
		lines.push(
			`${cols(
				[
					users,
					row.rps.toFixed(1),
					ms(row.api && row.api.med),
					ms(row.api && row.api['p(95)']),
					ms(row.api && row.api['p(99)']),
					PAGE_LOADS ? ms(row.page && row.page['p(95)']) : 'off',
					pct(row.errorRate),
					row.limited,
				],
				widths,
			).join(' ')}  ${verdict}${row.partial ? ' (aborted during this step)' : ''}`,
		);
	}
	return lines;
}

function endpointTable(data) {
	const rows = KEY_ENDPOINTS.map((name) => ({
		name,
		v: metric(data, `endpoint_duration{name:${name}}`),
	}))
		.filter((row) => row.v && row.v.max > 0)
		.sort((a, b) => b.v['p(95)'] - a.v['p(95)'])
		.slice(0, 12);
	const widths = [34, 9, 9, 9];
	return [
		cols(['Slowest screens / endpoints', 'p50', 'p95', 'max'], widths).join(' '),
		...rows.map((row) =>
			cols([row.name, ms(row.v.med), ms(row.v['p(95)']), ms(row.v.max)], widths).join(' '),
		),
	];
}

function failedThresholds(data) {
	const failed = [];
	for (const [name, m] of Object.entries(data.metrics)) {
		for (const [expr, result] of Object.entries(m.thresholds || {})) {
			if (!result.ok) failed.push(`${name}: ${expr}`);
		}
	}
	return failed;
}

export function handleSummary(data) {
	const plan = resolvePlan();
	const runSeconds = data.state.testRunDurationMs / 1000;
	const rows = plan.holds.map((hold) => evaluate(data, hold, runSeconds));

	let handled = null;
	let breaking = null;
	for (const row of rows) {
		if (!row.reached) break;
		if (row.problems.length) {
			breaking = row;
			break;
		}
		handled = row;
	}

	const total = metric(data, 'http_reqs');
	const checks = metric(data, 'checks');
	const serverErrors = metric(data, 'server_errors');
	const limited = metric(data, 'rate_limited');
	const codes = metric(data, 'short_codes_created');
	const slo =
		`API p95 < ${ms(SLO_API_P95_MS)}` +
		(PAGE_LOADS ? `, page p95 < ${ms(SLO_PAGE_P95_MS)}` : '') +
		`, errors < ${pct(SLO_ERROR_RATE)}, no 429`;

	const lines = [
		'',
		`QRcodly load test · ${PROFILE} · ${RUN_ID}`,
		`API ${API_URL}${PAGE_LOADS ? ` · frontend ${FRONTEND_URL}` : ' · page loads off'}`,
		`Duration ${Math.round(runSeconds / 60)} min · ${total ? total.count : 0} requests · checks ${pct(checks && checks.rate)} · server errors ${pct(serverErrors && serverErrors.rate)} · 429s ${limited ? limited.count : 0}`,
		`New short codes (reserved forever): ${codes ? codes.count : 0}`,
		'',
		...stepTable(rows),
		'',
		handled
			? `→ Handles ${handled.hold.users} concurrent users within the SLOs (${slo}).`
			: `→ Not even the first step met the SLOs (${slo}).`,
	];
	if (breaking) {
		lines.push(`  Limit reached at ${breaking.hold.users} users: ${breaking.problems.join(', ')}.`);
	} else if (handled && handled === rows[rows.length - 1]) {
		lines.push('  No limit reached — rerun with a higher USERS / STEPS to find it.');
	}
	lines.push('', ...endpointTable(data));

	const failed = failedThresholds(data);
	if (failed.length) lines.push('', 'Failed thresholds:', ...failed.map((f) => `  ✗ ${f}`));
	lines.push('');

	const report = lines.join('\n');
	return {
		stdout: report,
		[`${RESULTS_DIR}/${RUN_ID}-report.txt`]: report,
		[`${RESULTS_DIR}/${RUN_ID}-summary.json`]: JSON.stringify(data, null, 2),
	};
}
