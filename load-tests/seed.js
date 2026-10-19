// =============================================================================
// Gives every test user a realistic starting account — QR codes of several
// types (two dynamic), a standalone link, tags and a template — so lists, view
// counts and filters behave like for a real customer. The data has fixed names
// and stays between runs; seeding only tops up what is missing.
//
//   ./run.sh seed
// =============================================================================

import { sleep } from 'k6';
import exec from 'k6/execution';
import { SUMMARY_TREND_STATS } from './config.js';
import { api, body } from './lib/client.js';
import { userAt, userCount } from './lib/session.js';
import { randomInt, sample } from './data/random.js';
import {
	SEED_NAMES,
	SEED_QR_CODES,
	isSeedName,
	qrCodePayload,
	shortUrlPayload,
	tagPayload,
	templatePayload,
} from './data/payloads.js';

const QR_CODES = Number(__ENV.SEED_QR_CODES || 8);
const SHORT_URLS = Number(__ENV.SEED_SHORT_URLS || 1);
const TAGS = Number(__ENV.SEED_TAGS || 3);
const TEMPLATES = Number(__ENV.SEED_TEMPLATES || 1);
const CONCURRENCY = Number(__ENV.SEED_CONCURRENCY || 10);
// Creates are rate-limited per user (15 QR codes, 5 tags or templates per minute).
const WRITE_PAUSE_SECONDS = 1.2;

export const options = {
	scenarios: {
		seed: {
			executor: 'shared-iterations',
			vus: Math.max(1, Math.min(CONCURRENCY, userCount())),
			iterations: Math.max(1, userCount()),
			maxDuration: '4h',
		},
	},
	thresholds: { checks: ['rate>0.99'] },
	summaryTrendStats: SUMMARY_TREND_STATS,
};

function list(user, path, query = {}) {
	const res = api(user, 'GET', path, `seed GET ${path}`, {
		query: { page: 1, limit: 100, ...query },
		kind: 'admin',
	});
	return body(res) || { total: 0, data: [] };
}

function create(user, path, payload) {
	sleep(WRITE_PAUSE_SECONDS);
	const res = api(user, 'POST', path, `seed POST ${path}`, {
		body: payload,
		expect: 201,
		kind: 'admin',
	});
	return body(res, 201);
}

function names(user, path, query = {}) {
	return new Set(list(user, path, query).data.map((item) => item.name));
}

export default function () {
	const index = exec.scenario.iterationInTest;
	const user = userAt(index);

	const tags = list(user, '/tag').data.filter((tag) => isSeedName(tag.name));
	const tagNames = new Set(tags.map((tag) => tag.name));
	for (let n = 1; n <= TAGS; n++) {
		if (tagNames.has(SEED_NAMES.tag(n))) continue;
		const tag = create(user, '/tag', tagPayload(SEED_NAMES.tag(n)));
		if (tag) tags.push(tag);
	}

	const qrNames = names(user, '/qr-code');
	for (let n = 1; n <= QR_CODES; n++) {
		if (qrNames.has(SEED_NAMES.qrCode(n))) continue;
		const kind = SEED_QR_CODES[(n - 1) % SEED_QR_CODES.length];
		const qrCode = create(user, '/qr-code', qrCodePayload(SEED_NAMES.qrCode(n), kind));
		if (qrCode && tags.length && n % 2 === 1) {
			sleep(WRITE_PAUSE_SECONDS);
			api(user, 'PUT', `/tag/qr-code/${qrCode.id}`, 'seed PUT /tag/qr-code/:id', {
				body: { tagIds: sample(tags, randomInt(1, 2)).map((tag) => tag.id) },
				kind: 'admin',
			});
		}
	}

	const linkNames = names(user, '/short-url', { standalone: true });
	for (let n = 1; n <= SHORT_URLS; n++) {
		if (!linkNames.has(SEED_NAMES.link(n))) {
			create(user, '/short-url', shortUrlPayload(SEED_NAMES.link(n)));
		}
	}

	const templateNames = names(user, '/config-template');
	for (let n = 1; n <= TEMPLATES; n++) {
		if (!templateNames.has(SEED_NAMES.template(n))) {
			create(user, '/config-template', templatePayload(SEED_NAMES.template(n)));
		}
	}

	if ((index + 1) % 25 === 0 || index + 1 === userCount()) {
		console.log(`seeded ${index + 1}/${userCount()} users`);
	}
}
