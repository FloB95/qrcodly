import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import worker from './index.mjs';

const env = {
	BACKEND_API_URL: 'https://api.test/api/v1',
	REDIRECT_BASE_URL: 'https://www.brand.test',
};

const DOMAIN = 'links.customer.test';
/** In place of a status: the request itself fails. */
const UNREACHABLE = 'unreachable';

let cached;
let backendCalls;
let domainAnswer;
let aliasAnswer;

/** What the backend says about the host. */
function stubBackend(status, body) {
	domainAnswer = { status, body };
}

/** What the backend says when asked for an alias; without this it knows none. */
function stubAlias(status, body = {}) {
	aliasAnswer = { status, body };
}

const aliasCalls = () => backendCalls.filter((url) => url.includes('/short-url/resolve-alias'));
const request = (url) => worker.fetch(new Request(url), env);
const locationOf = async (url) => (await request(url)).headers.get('location');

beforeEach(() => {
	cached = new Map();
	backendCalls = [];
	domainAnswer = { status: 200, body: { domain: DOMAIN, isValid: true, hasAliases: true } };
	aliasAnswer = { status: 404, body: {} };
	globalThis.fetch = async (url) => {
		backendCalls.push(String(url));
		const answer = String(url).includes('/short-url/resolve-alias') ? aliasAnswer : domainAnswer;
		if (answer.status === UNREACHABLE) throw new TypeError('fetch failed');
		return new Response(JSON.stringify(answer.body), { status: answer.status });
	};
	// Workers expose the edge cache as a global; Node has none
	globalThis.caches = {
		default: {
			match: async (key) => cached.get(key.url)?.clone(),
			put: async (key, response) => void cached.set(key.url, response),
		},
	};
});

test('redirects a verified custom domain to the brand domain with path and query', async () => {
	stubBackend(200, { domain: 'links.customer.test', isValid: true });

	const response = await request('https://links.customer.test/u/abc12?utm_source=flyer');

	assert.equal(response.status, 302);
	assert.equal(response.headers.get('location'), 'https://www.brand.test/u/abc12?utm_source=flyer');
	assert.deepEqual(backendCalls, [
		'https://api.test/api/v1/custom-domain/resolve?domain=links.customer.test',
	]);
});

test('answers 404 for a host that is not a verified custom domain', async () => {
	stubBackend(200, { domain: 'unknown.test', isValid: false });

	const response = await request('https://unknown.test/u/abc12');

	assert.equal(response.status, 404);
});

test('answers 503 when the backend cannot resolve the host', async (t) => {
	t.mock.method(console, 'error', () => {});
	stubBackend(500, {});

	const response = await request('https://links.customer.test/u/abc12');

	assert.equal(response.status, 503);
	assert.equal(cached.size, 0);
});

test('asks the backend once per host while the answer is cached', async () => {
	stubBackend(200, { domain: 'links.customer.test', isValid: true });

	await request('https://links.customer.test/u/abc12');
	const second = await request('https://links.customer.test/u/xyz89');

	assert.equal(second.headers.get('location'), 'https://www.brand.test/u/xyz89');
	assert.equal(backendCalls.length, 1);
});

test('caches a verified host for five minutes and an unknown one for one', async () => {
	stubBackend(200, { domain: 'links.customer.test', isValid: true });
	await request('https://links.customer.test/u/abc12');
	stubBackend(200, { domain: 'unknown.test', isValid: false });
	await request('https://unknown.test/u/abc12');

	const cacheControl = (host) =>
		cached.get(`https://cache.internal/resolve/${host}`).headers.get('cache-control');
	assert.equal(cacheControl('links.customer.test'), 's-maxage=300');
	assert.equal(cacheControl('unknown.test'), 's-maxage=60');
});

for (const path of ['//evil.test/u/abc12', '/\\evil.test/u/abc12']) {
	test(`never redirects to a host taken from the request path (${path})`, async () => {
		stubBackend(200, { domain: 'links.customer.test', isValid: true });

		const response = await request(`https://links.customer.test${path}`);

		assert.equal(response.status, 302);
		assert.equal(new URL(response.headers.get('location')).host, 'www.brand.test');
	});
}

test('translates an alias into its short code and keeps the query', async () => {
	stubAlias(200, { shortCode: 'abc12' });

	const location = await locationOf(`https://${DOMAIN}/u/summer-party?utm_source=flyer`);

	assert.equal(location, 'https://www.brand.test/u/abc12?utm_source=flyer');
	assert.deepEqual(aliasCalls(), [
		`https://api.test/api/v1/short-url/resolve-alias?domain=${DOMAIN}&alias=summer-party`,
	]);
});

test('finds an alias that was typed in upper case', async () => {
	stubAlias(200, { shortCode: 'abc12' });

	const location = await locationOf(`https://${DOMAIN}/u/Summer-Party`);

	assert.equal(location, 'https://www.brand.test/u/abc12');
	assert.match(aliasCalls()[0], /alias=summer-party$/);
});

test('does not ask for an alias when a short code is scanned on a domain without aliases', async () => {
	stubBackend(200, { domain: DOMAIN, isValid: true, hasAliases: false });

	const location = await locationOf(`https://${DOMAIN}/u/abc12`);

	assert.equal(location, 'https://www.brand.test/u/abc12');
	assert.equal(backendCalls.length, 1);
});

test('asks again whether the domain has aliases once a "none" answer is a minute old', async (t) => {
	t.mock.timers.enable({ apis: ['Date'] });
	stubBackend(200, { domain: DOMAIN, isValid: true, hasAliases: false });
	await request(`https://${DOMAIN}/u/pizza`);

	t.mock.timers.tick(61_000);
	stubBackend(200, { domain: DOMAIN, isValid: true, hasAliases: true });
	stubAlias(200, { shortCode: 'abc12' });
	const location = await locationOf(`https://${DOMAIN}/u/pizza`);

	assert.equal(location, 'https://www.brand.test/u/abc12');
});

test('trusts a "none" answer for a minute, so short code scans cost no extra request', async (t) => {
	t.mock.timers.enable({ apis: ['Date'] });
	stubBackend(200, { domain: DOMAIN, isValid: true, hasAliases: false });
	await request(`https://${DOMAIN}/u/abc12`);

	t.mock.timers.tick(59_000);
	await request(`https://${DOMAIN}/u/xyz89`);

	assert.equal(backendCalls.length, 1);
});

test('keeps the host answer it has when asking again fails', async (t) => {
	t.mock.method(console, 'error', () => {});
	t.mock.timers.enable({ apis: ['Date'] });
	stubBackend(200, { domain: DOMAIN, isValid: true, hasAliases: false });
	await request(`https://${DOMAIN}/u/abc12`);

	t.mock.timers.tick(61_000);
	stubBackend(UNREACHABLE);
	const response = await request(`https://${DOMAIN}/u/abc12`);

	assert.equal(response.status, 302);
	assert.equal(response.headers.get('location'), 'https://www.brand.test/u/abc12');
});

test('asks for an alias that cannot be a short code even before the domain is known to have one', async () => {
	stubBackend(200, { domain: DOMAIN, isValid: true, hasAliases: false });
	stubAlias(200, { shortCode: 'abc12' });

	const location = await locationOf(`https://${DOMAIN}/u/summer-party`);

	assert.equal(location, 'https://www.brand.test/u/abc12');
});

test('checks a text that looks like a short code on a domain with aliases, and passes a real short code on', async () => {
	const location = await locationOf(`https://${DOMAIN}/u/abc12`);

	assert.equal(aliasCalls().length, 1);
	assert.equal(location, 'https://www.brand.test/u/abc12');
});

test('passes an unknown alias on unchanged, so the brand domain shows its not found page', async () => {
	const location = await locationOf(`https://${DOMAIN}/u/no-such-alias`);

	assert.equal(location, 'https://www.brand.test/u/no-such-alias');
});

test('asks once for the same alias while the answer is cached', async () => {
	stubAlias(200, { shortCode: 'abc12' });

	await request(`https://${DOMAIN}/u/summer-party`);
	const location = await locationOf(`https://${DOMAIN}/u/summer-party`);

	assert.equal(location, 'https://www.brand.test/u/abc12');
	assert.equal(aliasCalls().length, 1);
});

test('passes the request on when the alias lookup fails, and asks again next time', async (t) => {
	t.mock.method(console, 'error', () => {});
	stubAlias(500);

	const location = await locationOf(`https://${DOMAIN}/u/abc12`);
	await request(`https://${DOMAIN}/u/abc12`);

	assert.equal(location, 'https://www.brand.test/u/abc12');
	assert.equal(aliasCalls().length, 2);
});

test('passes the request on when the backend cannot be reached for the alias', async (t) => {
	t.mock.method(console, 'error', () => {});
	stubAlias(UNREACHABLE);

	const response = await request(`https://${DOMAIN}/u/abc12`);

	assert.equal(response.status, 302);
	assert.equal(response.headers.get('location'), 'https://www.brand.test/u/abc12');
});

test('ignores a short code from the backend that is not one', async () => {
	stubAlias(200, { shortCode: '../admin' });

	const location = await locationOf(`https://${DOMAIN}/u/summer-party`);

	assert.equal(location, 'https://www.brand.test/u/summer-party');
});

for (const path of [
	'/u/summer-party/file/doc1',
	'/u/ab',
	'/u/has_underscore',
	'/u/-menu',
	'/about',
	'/',
]) {
	test(`does not ask for an alias on ${path}`, async () => {
		const location = await locationOf(`https://${DOMAIN}${path}`);

		assert.equal(aliasCalls().length, 0);
		assert.equal(location, `https://www.brand.test${path}`);
	});
}
