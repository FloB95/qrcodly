// =============================================================================
// The dashboard's read queries with TanStack Query semantics: results stay
// fresh for 5 minutes, mutations invalidate them, and a new visit (full page
// load) starts with an empty cache. That way a VU only sends the requests a
// real browser would send.
// =============================================================================

import { api, apiBatch, body } from './client.js';

const STALE_MS = 5 * 60 * 1000;
let cache = {};

export function resetCache() {
	cache = {};
}

export function invalidate(...prefixes) {
	for (const key of Object.keys(cache)) {
		if (prefixes.some((prefix) => key.startsWith(prefix))) delete cache[key];
	}
}

function fresh(key) {
	const hit = cache[key];
	return hit && Date.now() - hit.at < STALE_MS ? hit : undefined;
}

/** Resolves query specs from cache, fetching the stale ones in parallel like mounted components do. */
export function fetchAll(user, specs) {
	const results = specs.map((spec) => {
		const hit = fresh(spec.key);
		return hit ? hit.data : undefined;
	});
	const missing = specs.map((spec, i) => (fresh(spec.key) ? -1 : i)).filter((i) => i >= 0);
	if (!missing.length) return results;

	const stale = missing.map((i) => specs[i]);
	const responses =
		stale.length === 1
			? [api(user, 'GET', stale[0].path, stale[0].name, { query: stale[0].query })]
			: apiBatch(user, stale);

	missing.forEach((specIndex, i) => {
		const data = body(responses[i]);
		if (data !== undefined) cache[specs[specIndex].key] = { at: Date.now(), data };
		results[specIndex] = data;
	});
	return results;
}

export function fetchOne(user, spec) {
	return fetchAll(user, [spec])[0];
}

const filterKey = (filter) => JSON.stringify(filter || {});

export const Q = {
	// dashboard sidebar (mounted on every dashboard page)
	qrCodeCount: () => ({
		key: 'qr:count',
		path: '/qr-code',
		query: { page: 1, limit: 1 },
		name: 'GET /qr-code (sidebar count)',
	}),
	shortUrlCount: () => ({
		key: 'short:count',
		path: '/short-url',
		query: { page: 1, limit: 1, standalone: true },
		name: 'GET /short-url (sidebar count)',
	}),
	templateCount: () => ({
		key: 'tpl:count',
		path: '/config-template',
		query: { page: 1, limit: 1 },
		name: 'GET /config-template (sidebar count)',
	}),
	sidebarTags: () => ({
		key: 'tag:list:1:50',
		path: '/tag',
		query: { page: 1, limit: 50 },
		name: 'GET /tag (sidebar)',
	}),
	safetyIncidents: () => ({
		key: 'safety',
		path: '/short-url/safety-incidents',
		name: 'GET /short-url/safety-incidents',
	}),

	// list pages
	qrCodes: (page = 1, filter) => ({
		key: `qr:list:${page}:${filterKey(filter)}`,
		path: '/qr-code',
		query: { page, limit: 10, ...filter },
		name: 'GET /qr-code',
	}),
	shortUrls: (page = 1) => ({
		key: `short:list:${page}`,
		path: '/short-url',
		query: { page, limit: 10, standalone: true },
		name: 'GET /short-url',
	}),
	tags: (page = 1) => ({
		key: `tag:list:${page}:10`,
		path: '/tag',
		query: { page, limit: 10 },
		name: 'GET /tag',
	}),
	templates: (page = 1) => ({
		key: `tpl:list:${page}`,
		path: '/config-template',
		query: { page, limit: 10 },
		name: 'GET /config-template',
	}),

	// per item / per page extras
	views: (shortCode) => ({
		key: `views:${shortCode}`,
		path: `/short-url/${shortCode}/get-views`,
		name: 'GET /short-url/:code/get-views',
	}),
	analytics: (shortCode) => ({
		key: `analytics:${shortCode}`,
		path: `/short-url/${shortCode}/analytics`,
		name: 'GET /short-url/:code/analytics',
	}),
	subscription: () => ({
		key: 'billing',
		path: '/billing/subscription',
		name: 'GET /billing/subscription',
	}),
	reservedShortUrl: () => ({
		key: 'reserved',
		path: '/short-url/reserved',
		name: 'GET /short-url/reserved',
	}),
	// Public endpoint the browser calls anonymously. Sent with the token here: all VUs share one
	// IP, and the anonymous bucket (30/min per IP) would otherwise throttle them artificially.
	predefinedTemplates: () => ({
		key: 'tpl:predefined',
		path: '/config-template/predefined',
		name: 'GET /config-template/predefined',
	}),
	defaultDomain: () => ({
		key: 'domain:default',
		path: '/custom-domain/default',
		name: 'GET /custom-domain/default',
	}),
};

/**
 * The dashboard sidebar and banner are mounted on every page; cached unless a mutation
 * invalidated them. `pageQueries` load in the same parallel burst and come back first.
 */
export function sidebar(user, pageQueries = []) {
	return fetchAll(user, [
		...pageQueries,
		Q.qrCodeCount(),
		Q.shortUrlCount(),
		Q.templateCount(),
		Q.sidebarTags(),
		Q.safetyIncidents(),
	]);
}

export function tagIds(user) {
	const tags = fetchOne(user, Q.sidebarTags());
	return tags && tags.data ? tags.data.map((tag) => tag.id) : [];
}

/** Every list row with a short URL shows its view count, fetched per row. */
export function loadViews(user, items) {
	const codes = (items || [])
		.map((item) => (item.shortUrl ? item.shortUrl.shortCode : item.shortCode))
		.filter(Boolean);
	if (codes.length) fetchAll(user, codes.map(Q.views));
}
