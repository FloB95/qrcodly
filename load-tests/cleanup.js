// =============================================================================
// Removes test-user data through the API, so the same code paths clean up that
// users trigger (shares, tag links and preview images go along).
//
//   ./run.sh cleanup   back to the seeded baseline: delete what load runs created
//   ./run.sh destroy   CLEANUP_MODE=all — delete everything, then the Clerk users
//
// Afterwards every user is listed again; the run fails unless nothing but the
// allowed data is left, so `destroy` never removes a user who still owns data.
// Short codes are never freed by QRcodly — deleted links stay reserved forever.
// =============================================================================

import { sleep } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';
import { SUMMARY_TREND_STATS } from './config.js';
import { api, body } from './lib/client.js';
import { userAt, userCount } from './lib/session.js';
import { isSeedName } from './data/payloads.js';

const MODE = __ENV.CLEANUP_MODE === 'all' ? 'all' : 'runs';
const CONCURRENCY = Number(__ENV.CLEANUP_CONCURRENCY || 10);
// Deletes share the default per-user limit of 120 requests per minute.
const DELETE_PAUSE_SECONDS = 0.55;

const leftovers = new Counter('leftovers');

export const options = {
	scenarios: {
		cleanup: {
			executor: 'shared-iterations',
			vus: Math.max(1, Math.min(CONCURRENCY, userCount())),
			iterations: Math.max(1, userCount()),
			maxDuration: '4h',
		},
	},
	thresholds: { leftovers: ['count==0'] },
	summaryTrendStats: SUMMARY_TREND_STATS,
};

// Order matters: QR codes first (their links and shares go with them), tags last.
const RESOURCES = [
	{ path: '/qr-code', query: {}, item: (qr) => `/qr-code/${qr.id}`, name: 'DELETE /qr-code/:id' },
	{
		path: '/short-url',
		query: { standalone: true },
		item: (link) => `/short-url/${link.shortCode}`,
		name: 'DELETE /short-url/:code',
	},
	{
		path: '/config-template',
		query: {},
		item: (template) => `/config-template/${template.id}`,
		name: 'DELETE /config-template/:id',
	},
	{ path: '/tag', query: {}, item: (tag) => `/tag/${tag.id}`, name: 'DELETE /tag/:id' },
];

const shouldDelete = (item) => MODE === 'all' || !isSeedName(item.name);

function listAll(user, resource) {
	const items = [];
	for (let page = 1; page <= 100; page++) {
		const res = api(user, 'GET', resource.path, `cleanup GET ${resource.path}`, {
			query: { page, limit: 100, ...resource.query },
			kind: 'admin',
		});
		const list = body(res);
		if (!list) return undefined;
		items.push(...list.data);
		if (list.data.length < 100) break;
	}
	return items;
}

function purge(user, resource) {
	// A few rounds pick up transient failures; stop once nothing more can be deleted.
	for (let round = 0; round < 5; round++) {
		const items = (listAll(user, resource) || []).filter(shouldDelete);
		if (!items.length) return;
		let deleted = 0;
		for (const item of items) {
			sleep(DELETE_PAUSE_SECONDS);
			const res = api(user, 'DELETE', resource.item(item), `cleanup ${resource.name}`, {
				kind: 'admin',
			});
			if (res.status === 200) deleted++;
		}
		if (!deleted) return;
	}
}

export default function () {
	const index = exec.scenario.iterationInTest;
	const user = userAt(index);

	for (const resource of RESOURCES) purge(user, resource);

	for (const resource of RESOURCES) {
		const items = listAll(user, resource);
		const left = items ? items.filter(shouldDelete).length : 1;
		if (left > 0) {
			leftovers.add(left);
			console.error(`test user #${index + 1} (${user.id}) still owns ${left} × ${resource.path}`);
		}
	}

	if ((index + 1) % 25 === 0 || index + 1 === userCount()) {
		console.log(`cleaned ${index + 1}/${userCount()} users (${MODE})`);
	}
}
