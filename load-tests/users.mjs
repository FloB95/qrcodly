#!/usr/bin/env node
// =============================================================================
// Test accounts for the load test, managed through Clerk.
//
//   node users.mjs provision --count 200   create users + sessions (resumable)
//   node users.mjs tokens --count 200 --ttl 7200 --out .state/tokens.json
//   node users.mjs status | count
//   node users.mjs delete --yes            delete the Clerk users again
//
// Production instances refuse to create sessions from the backend (POST /sessions
// is test-only), so each user signs in once with a one-time sign-in token through
// the Frontend API — the magic-link flow. The session then lives for the
// instance's session lifetime (7 days by default) and hands out tokens with a
// custom lifetime via the Backend API, so nothing has to refresh during a run.
// =============================================================================

import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const DIR = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(DIR, '.state', 'users.json');
const DEFAULT_TOKENS_FILE = join(DIR, '.state', 'tokens.json');
if (existsSync(join(DIR, '.env'))) process.loadEnvFile(join(DIR, '.env'));

const SECRET = process.env.CLERK_SECRET_KEY || '';
const PUBLISHABLE = process.env.CLERK_PUBLISHABLE_KEY || '';
const CLERK_API = (process.env.CLERK_API_URL || 'https://api.clerk.com/v1').replace(/\/+$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.qrcodly.de').replace(/\/+$/, '');
const EMAIL_DOMAIN = process.env.LOADTEST_EMAIL_DOMAIN || 'loadtest.qrcodly.de';
// The Backend API allows 1000 requests per 10 s in production — shared with live traffic.
const BAPI_PER_SECOND = Number(process.env.CLERK_BAPI_RATE || 20);
// The Frontend API allows 5 sign-ins per 10 s per IP.
const SIGN_IN_INTERVAL_MS = 2200;
const USER_AGENT = 'qrcodly-loadtest-provisioner';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(message) {
	console.error(`✗ ${message}`);
	process.exit(1);
}

class HttpError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

// --- Clerk instance ----------------------------------------------------------

function instance() {
	if (!SECRET) fail('CLERK_SECRET_KEY is missing (load-tests/.env)');
	if (SECRET.startsWith('sk_live_')) return 'production';
	if (SECRET.startsWith('sk_test_')) return 'development';
	fail('CLERK_SECRET_KEY must start with sk_live_ or sk_test_');
}

function frontendApi() {
	if (process.env.CLERK_FAPI_URL) return process.env.CLERK_FAPI_URL.replace(/\/+$/, '');
	const [, kind, encoded] = PUBLISHABLE.split('_');
	if (!encoded) fail('CLERK_PUBLISHABLE_KEY is missing (it tells us where the Frontend API lives)');
	if ((kind === 'live') !== (instance() === 'production')) {
		fail('CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY belong to different Clerk instances');
	}
	return `https://${Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '')}`;
}

// --- HTTP ----------------------------------------------------------------------

/** Spaces calls `intervalMs` apart, also across concurrent callers. */
function pacer(intervalMs) {
	let next = 0;
	return async () => {
		const now = Date.now();
		const at = Math.max(now, next);
		next = at + intervalMs;
		if (at > now) await sleep(at - now);
	};
}

const bapiSlot = pacer(1000 / BAPI_PER_SECOND);
const signInSlot = pacer(SIGN_IN_INTERVAL_MS);

function clerkMessage(json) {
	const error = json && json.errors && json.errors[0];
	if (!error) return undefined;
	return `${error.long_message || error.message}${error.code ? ` (${error.code})` : ''}`;
}

async function request(url, init, slot) {
	const label = `${init.method || 'GET'} ${url.replace(CLERK_API, '').split('?')[0]}`;
	for (let attempt = 1; ; attempt++) {
		await slot();
		let res;
		try {
			res = await fetch(url, init);
		} catch (error) {
			if (attempt < 4) {
				await sleep(1000 * attempt);
				continue;
			}
			throw error;
		}
		if ((res.status === 429 || res.status >= 500) && attempt < 6) {
			const retryAfter = Number(res.headers.get('retry-after'));
			await sleep(retryAfter > 0 ? retryAfter * 1000 : 2000 * attempt);
			continue;
		}
		const text = await res.text();
		let json = null;
		try {
			json = text ? JSON.parse(text) : null;
		} catch {
			json = null;
		}
		if (!res.ok) {
			throw new HttpError(
				res.status,
				`${label} → ${res.status}: ${clerkMessage(json) || text.slice(0, 200)}`,
			);
		}
		return json;
	}
}

function bapi(method, path, body) {
	return request(
		`${CLERK_API}${path}`,
		{
			method,
			headers: {
				Authorization: `Bearer ${SECRET}`,
				'Content-Type': 'application/json',
				'User-Agent': USER_AGENT,
			},
			body: body ? JSON.stringify(body) : undefined,
		},
		bapiSlot,
	);
}

async function mapLimit(items, limit, fn) {
	const results = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await fn(items[index], index);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

// --- state -----------------------------------------------------------------------

async function loadState() {
	const fresh = { instance: instance(), frontendApi: frontendApi(), users: [] };
	if (!existsSync(STATE_FILE)) return fresh;
	const state = JSON.parse(await readFile(STATE_FILE, 'utf8'));
	if (state.frontendApi !== fresh.frontendApi) {
		fail(
			`.state/users.json belongs to ${state.frontendApi}, but the keys point to ` +
				`${fresh.frontendApi}. Move the file away to start over for this instance.`,
		);
	}
	return state;
}

async function writePrivate(file, data) {
	await mkdir(dirname(file), { recursive: true });
	const tmp = `${file}.tmp`;
	await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
	await chmod(tmp, 0o600);
	await rename(tmp, file);
}

// Serialised: concurrent workers must not race on the temp file.
let saving = Promise.resolve();
function saveState(state) {
	saving = saving.then(() => writePrivate(STATE_FILE, state));
	return saving;
}

// --- users & sessions ------------------------------------------------------------

const externalId = (i) => `loadtest-${String(i).padStart(4, '0')}`;

async function ensureUser(i) {
	const id = externalId(i);
	const found = await bapi('GET', `/users?external_id=${encodeURIComponent(id)}&limit=1`);
	const existing = Array.isArray(found) ? found : (found && found.data) || [];
	if (existing.length) return existing[0].id;

	const created = await bapi('POST', '/users', {
		external_id: id,
		email_address: [`${id}@${EMAIL_DOMAIN}`],
		first_name: 'Loadtest',
		last_name: String(i).padStart(4, '0'),
		skip_password_requirement: true,
		skip_legal_checks: true,
		// ticket sign-ins from a fresh "device" must not ask for an email code
		bypass_client_trust: true,
		private_metadata: { loadTest: true },
	});
	return created.id;
}

async function createSession(userId) {
	if (instance() === 'development') {
		const session = await bapi('POST', '/sessions', { user_id: userId });
		return session.id;
	}

	const { token: ticket } = await bapi('POST', '/sign_in_tokens', {
		user_id: userId,
		expires_in_seconds: 600,
	});
	const json = await request(
		`${frontendApi()}/v1/client/sign_ins`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Origin: FRONTEND_URL,
				'User-Agent': USER_AGENT,
			},
			body: new URLSearchParams({ strategy: 'ticket', ticket }).toString(),
		},
		signInSlot,
	);
	const signIn = json && json.response;
	if (!signIn || signIn.status !== 'complete' || !signIn.created_session_id) {
		throw new Error(
			`ticket sign-in for ${userId} ended with status "${signIn && signIn.status}" — ` +
				'check the instance settings (MFA, device trust) in the Clerk dashboard',
		);
	}
	return signIn.created_session_id;
}

async function sessionUsable(sessionId) {
	if (!sessionId) return false;
	try {
		const session = await bapi('GET', `/sessions/${sessionId}`);
		// needs to outlive at least a long soak run
		return session.status === 'active' && session.expire_at > Date.now() + 3 * 3600 * 1000;
	} catch (error) {
		if (error instanceof HttpError && error.status === 404) return false;
		throw error;
	}
}

async function mint(sessionId, ttlSeconds) {
	const res = await bapi('POST', `/sessions/${sessionId}/tokens`, {
		expires_in_seconds: ttlSeconds,
	});
	return res.jwt;
}

function claims(jwt) {
	return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
}

// --- commands ----------------------------------------------------------------------

async function provision(count) {
	const state = await loadState();
	console.log(`Clerk ${state.instance} instance (${state.frontendApi}) — ${count} test users`);

	const known = new Set(state.users.map((user) => user.i));
	const missing = Array.from({ length: count }, (_, k) => k + 1).filter((i) => !known.has(i));
	let created = 0;
	await mapLimit(missing, 5, async (i) => {
		state.users.push({ i, userId: await ensureUser(i), sessionId: null });
		if (++created % 25 === 0) {
			await saveState(state);
			console.log(`  accounts ${created}/${missing.length}`);
		}
	});
	state.users.sort((a, b) => a.i - b.i);
	await saveState(state);
	if (missing.length) console.log(`✓ ${missing.length} accounts created or adopted`);

	const wanted = state.users.filter((user) => user.i <= count);
	const usable = await mapLimit(wanted, 10, (user) => sessionUsable(user.sessionId));
	const todo = wanted.filter((_, k) => !usable[k]);
	if (!todo.length) {
		console.log(`✓ all ${count} users have an active session`);
		return;
	}

	if (state.instance === 'production') {
		const minutes = Math.ceil((todo.length * SIGN_IN_INTERVAL_MS) / 60000);
		console.log(
			`Signing in ${todo.length} users (Clerk allows 5 sign-ins per 10 s) — ~${minutes} min`,
		);
	}
	for (const [k, user] of todo.entries()) {
		user.sessionId = await createSession(user.userId);
		await saveState(state);
		if ((k + 1) % 25 === 0 || k + 1 === todo.length)
			console.log(`  sessions ${k + 1}/${todo.length}`);
	}
	console.log(`✓ ${count} test users ready`);
}

async function tokens(count, ttlSeconds, out) {
	const state = await loadState();
	const users = state.users.filter((user) => user.i <= count && user.sessionId);
	if (users.length < count) {
		fail(
			`Only ${users.length} test users are ready, this needs ${count} → ./run.sh provision ${count}`,
		);
	}

	let reSignedIn = 0;
	const minted = await mapLimit(users, 10, async (user) => {
		let jwt;
		try {
			jwt = await mint(user.sessionId, ttlSeconds);
		} catch (error) {
			// An ended session (expired, revoked) gets one fresh sign-in; anything else is fatal.
			if (!(error instanceof HttpError) || [401, 403, 429].includes(error.status)) throw error;
			user.sessionId = await createSession(user.userId);
			reSignedIn++;
			jwt = await mint(user.sessionId, ttlSeconds);
		}
		const { sub, iat, exp } = claims(jwt);
		if (sub !== user.userId) throw new Error(`token for ${user.userId} was issued for ${sub}`);
		return { userId: user.userId, token: jwt, iat, exp };
	});
	if (reSignedIn) await saveState(state);

	await writePrivate(out, {
		generatedAt: new Date().toISOString(),
		instance: state.instance,
		ttlSeconds,
		users: minted,
	});
	const validUntil = new Date(Math.min(...minted.map((t) => t.exp)) * 1000);
	console.log(
		`✓ ${minted.length} tokens valid until ${validUntil.toLocaleString()} → ${relative(process.cwd(), out)}`,
	);
}

async function status() {
	const state = await loadState();
	const ready = state.users.filter((user) => user.sessionId).length;
	console.log(`Clerk instance:  ${state.instance} (${state.frontendApi})`);
	console.log(`Test users:      ${state.users.length} provisioned, ${ready} with a session`);
	if (existsSync(DEFAULT_TOKENS_FILE)) {
		const file = JSON.parse(await readFile(DEFAULT_TOKENS_FILE, 'utf8'));
		const exp = Math.min(...file.users.map((t) => t.exp)) * 1000;
		const validity = exp > Date.now() ? `valid until ${new Date(exp).toLocaleString()}` : 'expired';
		console.log(`Tokens:          ${file.users.length}, ${validity}`);
	}
}

async function count() {
	const state = await loadState();
	console.log(state.users.filter((user) => user.sessionId).length);
}

async function remove(confirmed) {
	if (!confirmed) {
		fail(
			'This deletes the test users from Clerk. Use ./run.sh destroy instead — it first deletes ' +
				'and verifies all their data, so no rows of deleted users stay behind.',
		);
	}
	const state = await loadState();
	let deleted = 0;
	await mapLimit(state.users, 5, async (user) => {
		let clerkUser;
		try {
			clerkUser = await bapi('GET', `/users/${user.userId}`);
		} catch (error) {
			if (error instanceof HttpError && error.status === 404) return;
			throw error;
		}
		// Only ever delete accounts this script created.
		if (!String(clerkUser.external_id || '').startsWith('loadtest-')) {
			console.warn(`  skipped ${user.userId}: not a load-test account`);
			return;
		}
		await bapi('DELETE', `/users/${user.userId}`);
		deleted++;
	});
	await rm(STATE_FILE, { force: true });
	await rm(DEFAULT_TOKENS_FILE, { force: true });
	console.log(`✓ deleted ${deleted} test users from Clerk`);
}

// --- CLI -------------------------------------------------------------------------

const [command] = process.argv.slice(2);
const { values } = parseArgs({
	args: process.argv.slice(3),
	options: {
		count: { type: 'string' },
		ttl: { type: 'string' },
		out: { type: 'string' },
		yes: { type: 'boolean', default: false },
	},
});
const countArg = Number(values.count || process.env.LOADTEST_USERS || 100);

const commands = {
	provision: () => provision(countArg),
	tokens: () => tokens(countArg, Number(values.ttl || 7200), values.out || DEFAULT_TOKENS_FILE),
	status,
	count,
	delete: () => remove(values.yes),
};

if (!commands[command]) {
	console.log(
		'usage: node users.mjs provision|tokens|status|count|delete [--count N] [--ttl s] [--out file] [--yes]',
	);
	process.exit(command ? 1 : 0);
}
commands[command]().catch((error) => fail(error.message));
