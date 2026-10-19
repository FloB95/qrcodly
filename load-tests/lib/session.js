// =============================================================================
// Test users → VUs. Every VU is one real Clerk test account (1:1 by VU id), so
// per-user rate limits and per-user data behave exactly like in production.
// Tokens come from `node users.mjs tokens` (minted to outlive the whole run).
// =============================================================================

import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { TOKENS_FILE } from '../config.js';

const USERS = new SharedArray('test-users', () => {
	try {
		return JSON.parse(open(TOKENS_FILE)).users || [];
	} catch (_) {
		// `k6 inspect` and a first dry run have no tokens yet; setup() reports it.
		return [];
	}
});

const LOCALE_WEIGHTS = [
	['de', 55],
	['en', 25],
	['fr', 4],
	['es', 4],
	['it', 3],
	['nl', 3],
	['pl', 2],
	['pt', 2],
	['ru', 2],
];

const ACCEPT_LANGUAGE = {
	de: 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
	en: 'en-US,en;q=0.9',
	fr: 'fr-FR,fr;q=0.9,en;q=0.8',
	es: 'es-ES,es;q=0.9,en;q=0.8',
	it: 'it-IT,it;q=0.9,en;q=0.8',
	nl: 'nl-NL,nl;q=0.9,en;q=0.8',
	pl: 'pl-PL,pl;q=0.9,en;q=0.8',
	pt: 'pt-BR,pt;q=0.9,en;q=0.8',
	ru: 'ru-RU,ru;q=0.9,en;q=0.8',
};

// 100 slots in weight proportion, so a user keeps the same language across runs.
const LOCALE_SLOTS = LOCALE_WEIGHTS.flatMap(([locale, weight]) => Array(weight).fill(locale));

export function userCount() {
	return USERS.length;
}

export function userAt(index) {
	const raw = USERS[index % USERS.length];
	const locale = LOCALE_SLOTS[(index * 37) % LOCALE_SLOTS.length];
	return {
		index,
		id: raw.userId,
		token: raw.token,
		iat: raw.iat,
		exp: raw.exp,
		locale,
		acceptLanguage: ACCEPT_LANGUAGE[locale],
	};
}

let current = null;

/** The account this VU plays for the whole run. */
export function currentUser() {
	if (current) return current;
	if (!USERS.length) exec.test.abort('No test-user tokens loaded — start the test via ./run.sh');
	current = userAt(exec.vu.idInTest - 1);
	return current;
}

export function earliestTokenExpiry() {
	let min = Infinity;
	for (let i = 0; i < USERS.length; i++) min = Math.min(min, USERS[i].exp);
	return min;
}
