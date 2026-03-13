// =============================================================================
// Short URL CRUD scenario
// Simulates: list → create → get details → update → toggle active → delete
// =============================================================================

import { check, sleep } from 'k6';
import { BASE_URL } from '../config.js';
import { apiGet, apiPost, apiPatch, apiDelete } from '../helpers.js';
import { getValidToken } from '../auth.js';
import { createShortUrlPayload, updateShortUrlPayload } from '../data/payloads.js';

export function shortUrlCrudFlow() {
	const token = getValidToken();
	if (!token) return;

	// 1. List short URLs
	const listRes = apiGet(`${BASE_URL}/short-url?page=1&limit=10&standalone=true`, token, {
		type: 'api_list',
	});
	check(listRes, {
		'ShortURL list: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 2. Create short URL
	const createRes = apiPost(`${BASE_URL}/short-url`, createShortUrlPayload(), token, {
		type: 'api_create',
	});
	const created = check(createRes, {
		'ShortURL create: status 200': (r) => r.status === 200 || r.status === 201,
	});

	if (!created || (createRes.status !== 200 && createRes.status !== 201)) {
		sleep(2);
		return;
	}

	let shortUrl;
	try {
		shortUrl = JSON.parse(createRes.body);
	} catch {
		sleep(2);
		return;
	}

	const shortCode = shortUrl.shortCode;
	sleep(1);

	// 3. Get short URL details
	const detailRes = apiGet(`${BASE_URL}/short-url/${shortCode}/detail`, token, {
		type: 'api_get',
	});
	check(detailRes, {
		'ShortURL detail: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 4. Update short URL
	const updateRes = apiPatch(`${BASE_URL}/short-url/${shortCode}`, updateShortUrlPayload(), token, {
		type: 'api_update',
	});
	check(updateRes, {
		'ShortURL update: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 5. Toggle active state
	const toggleRes = apiPatch(`${BASE_URL}/short-url/${shortCode}/toggle-active-state`, {}, token, {
		type: 'api_update',
	});
	check(toggleRes, {
		'ShortURL toggle: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 6. Get views
	const viewsRes = apiGet(`${BASE_URL}/short-url/${shortCode}/get-views`, token, {
		type: 'api_get',
	});
	check(viewsRes, {
		'ShortURL views: status 200': (r) => r.status === 200,
	});
	sleep(1);

	// 7. Delete short URL
	const deleteRes = apiDelete(`${BASE_URL}/short-url/${shortCode}`, token, {
		type: 'api_delete',
	});
	check(deleteRes, {
		'ShortURL delete: status 200': (r) => r.status === 200 || r.status === 204,
	});

	sleep(2);
}
