/**
 * Entry point for every request on a customer's custom domain (Cloudflare for SaaS).
 * Asks the backend whether the host is a verified custom domain and redirects the request to the
 * brand domain, where the short URL is resolved. An alias in the path (`/u/summer-party`) is
 * translated into its short code first, so everything behind the worker only knows short codes.
 */

// Cache TTLs in seconds. Invalid hosts expire fast so a newly verified domain works quickly.
const VALID_HOST_TTL = 300;
const INVALID_HOST_TTL = 60;
// An alias can be changed or removed at any time
const ALIAS_TTL = 60;
// How long "this domain has no aliases" is trusted, so the first alias of a domain works soon
const NO_ALIASES_TTL = 60;

const SCAN_PATH = /^\/u\/([^/]+)$/;
const SHORT_CODE = /^[a-z0-9]{5}$/;
// the rules of ShortUrlAliasSchema in packages/shared
const ALIAS = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALIAS_MIN_LENGTH = 3;
const ALIAS_MAX_LENGTH = 80;

const cacheKey = (path) => new Request(`https://cache.internal/${path}`, { method: 'GET' });

async function readCache(key) {
	const hit = await caches.default.match(key);
	return hit ? hit.json() : undefined;
}

async function writeCache(key, value, ttl) {
	const response = new Response(JSON.stringify(value), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `s-maxage=${ttl}`,
		},
	});
	await caches.default.put(key, response);
}

/** Asks the backend about the host and remembers the answer. Null when it does not answer. */
async function askHost(backendApiUrl, hostname) {
	const response = await fetch(
		`${backendApiUrl}/custom-domain/resolve?domain=${encodeURIComponent(hostname)}`,
	);
	if (!response.ok) {
		console.error('Resolve API error:', response.status);
		return null;
	}

	const host = { ...(await response.json()), askedAt: Date.now() };
	await writeCache(
		cacheKey(`resolve/${hostname}`),
		host,
		host.isValid ? VALID_HOST_TTL : INVALID_HOST_TTL,
	);
	return host;
}

/** The text after `/u/` in lower case, if it could be an alias. */
function aliasCandidate(pathname) {
	const text = SCAN_PATH.exec(pathname)?.[1].toLowerCase();
	if (!text || text.length < ALIAS_MIN_LENGTH || text.length > ALIAS_MAX_LENGTH) return null;
	return ALIAS.test(text) ? text : null;
}

/** The short code an alias stands for. Null when it is none, or when the backend cannot be asked. */
async function resolveAlias(backendApiUrl, hostname, alias) {
	const key = cacheKey(`alias/${hostname}/${alias}`);
	const cached = await readCache(key);
	if (cached) return cached.shortCode;

	let shortCode = null;
	try {
		const response = await fetch(
			`${backendApiUrl}/short-url/resolve-alias?domain=${encodeURIComponent(hostname)}&alias=${encodeURIComponent(alias)}`,
		);
		if (response.ok) {
			const answer = await response.json();
			if (typeof answer.shortCode === 'string' && SHORT_CODE.test(answer.shortCode)) {
				shortCode = answer.shortCode;
			}
		} else if (response.status !== 404) {
			throw new Error(`status ${response.status}`);
		}
	} catch (error) {
		// Not cached, and the request goes on unchanged: a printed short code must keep working
		// while the backend struggles.
		console.error('Alias API error:', error);
		return null;
	}

	await writeCache(key, { shortCode }, ALIAS_TTL);
	return shortCode;
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const hostname = url.hostname;

		const backendApiUrl = env.BACKEND_API_URL || 'https://api.qrcodly.de/api/v1';
		const redirectBaseUrl = env.REDIRECT_BASE_URL || 'https://www.qrcodly.de';

		try {
			let host =
				(await readCache(cacheKey(`resolve/${hostname}`))) ??
				(await askHost(backendApiUrl, hostname));

			if (!host) {
				return new Response('Service temporarily unavailable', { status: 503 });
			}
			if (!host.isValid) {
				return new Response('Hostname not registered', { status: 404 });
			}

			// A text that looks like a short code is only looked up on a domain that has aliases, so
			// scans on every other domain cost no extra request. Any other text cannot be a short
			// code and is always looked up.
			const alias = aliasCandidate(url.pathname);
			const looksLikeShortCode = alias !== null && SHORT_CODE.test(alias);

			const noAliasesIsFresh = host.askedAt > Date.now() - NO_ALIASES_TTL * 1000;
			if (looksLikeShortCode && !host.hasAliases && !noAliasesIsFresh) {
				// the answer we have stays good when the backend cannot be asked
				const asked = await askHost(backendApiUrl, hostname).catch((error) => {
					console.error('Resolve API error:', error);
					return null;
				});
				host = asked ?? host;
			}

			const isLookedUp = alias !== null && (host.hasAliases || !looksLikeShortCode);
			const shortCode = isLookedUp ? await resolveAlias(backendApiUrl, hostname, alias) : null;

			// Set path and query on the brand URL instead of resolving them against it: a path that
			// starts with two slashes would otherwise be read as another host (open redirect).
			const redirectUrl = new URL(redirectBaseUrl);
			redirectUrl.pathname = shortCode ? `/u/${shortCode}` : url.pathname;
			redirectUrl.search = url.search;
			return Response.redirect(redirectUrl.toString(), 302);
		} catch (error) {
			console.error('Worker error:', error);
			return new Response('Service temporarily unavailable', { status: 503 });
		}
	},
};
