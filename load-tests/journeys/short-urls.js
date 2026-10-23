// =============================================================================
// Standalone short URLs: list with view counts, create, details + analytics,
// edit, pause/resume and delete.
// =============================================================================

import { UNIQUE_URLS } from '../config.js';
import { api, body, page } from '../lib/client.js';
import { Q, fetchAll, fetchOne, invalidate, loadViews, sidebar } from '../lib/queries.js';
import {
	action,
	CAPS,
	codeCreated,
	forget,
	itemName,
	mayCreateCode,
	mine,
	think,
} from '../lib/util.js';
import { pick } from '../data/random.js';
import { isSeedName, shortUrlPayload, shortUrlUpdate } from '../data/payloads.js';

const LIST = '/dashboard/short-urls';

function refreshList(user) {
	const list = fetchOne(user, Q.shortUrls(1));
	loadViews(user, list && list.data);
	return list;
}

function remove(user, shortUrl) {
	api(user, 'DELETE', `/short-url/${shortUrl.shortCode}`, 'DELETE /short-url/:code');
	forget('shortUrls', (own) => own.shortCode === shortUrl.shortCode);
	invalidate('short:');
	sidebar(user);
}

function create(user) {
	while (mine.shortUrls.length >= CAPS.shortUrls) remove(user, mine.shortUrls[0]);
	think(10, 30);
	const res = api(user, 'POST', '/short-url', 'POST /short-url', {
		body: shortUrlPayload(itemName(), UNIQUE_URLS),
		expect: 201,
	});
	const created = body(res, 201);
	if (!created) return;
	codeCreated();
	mine.shortUrls.push(created);
	invalidate('short:');
	sidebar(user);
	refreshList(user);
}

function detail(user, shortUrl) {
	// server-rendered: the Next.js server fetches GET /short-url/:code/detail itself
	page(user, `${LIST}/${shortUrl.shortCode}`, `${LIST}/:code`);
	fetchOne(user, Q.analytics(shortUrl.shortCode));
	think(8, 20);
}

function update(user, shortUrl) {
	think(8, 20);
	const name = isSeedName(shortUrl.name) ? null : itemName();
	api(user, 'PATCH', `/short-url/${shortUrl.shortCode}`, 'PATCH /short-url/:code', {
		body: shortUrlUpdate(name, UNIQUE_URLS),
	});
	invalidate('short:');
	refreshList(user);
}

/** Pause and resume one of this run's links — a paused seeded link would break the scan test. */
function toggle(user, shortUrl) {
	const path = `/short-url/${shortUrl.shortCode}/toggle-active-state`;
	const name = 'PATCH /short-url/:code/toggle-active-state';
	api(user, 'PATCH', path, name);
	invalidate('short:');
	think(5, 15);
	api(user, 'PATCH', path, name);
	invalidate('short:');
}

export function shortUrls(user) {
	action('short urls', () => {
		page(user, LIST, LIST);
		const [list] = fetchAll(user, [Q.shortUrls(1), Q.defaultDomain()]);
		const items = (list && list.data) || [];
		loadViews(user, items);
		think(5, 15);

		const own = pick(mine.shortUrls);
		const any = own || pick(items);
		const roll = Math.random();
		if ((roll < 0.35 || !any) && mayCreateCode()) return create(user);
		if (!any) return undefined;
		if (roll < 0.7) return detail(user, any);
		if (roll < 0.85) return update(user, any);
		if (!own) return detail(user, any);
		if (roll < 0.9) return toggle(user, own);
		return remove(user, mine.shortUrls[0]);
	});
}
