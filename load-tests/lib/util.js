import { sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { NEW_CODES_PER_USER, RUN_ID, THINK } from '../config.js';
import { randomId } from '../data/random.js';

/**
 * Labels one user action. Deliberately not k6's group(): every group gets its own series in the
 * web dashboard, and series that first appear mid-run crash its charts.
 */
export function action(_name, fn) {
	return fn();
}

/** Human pause (reading, typing, deciding) in seconds, scaled by THINK. */
export function think(min, max) {
	const seconds = (min + Math.random() * (max - min)) * THINK;
	if (seconds > 0) sleep(seconds);
}

/** Names make test data recognisable in the DB and in logs. */
export function itemName() {
	return `lt-${RUN_ID}-${randomId(5)}`.slice(0, 50);
}

export function tagName() {
	return `lt-${randomId(6)}`;
}

// What this VU created during the run. Journeys only ever delete from here, so the
// seeded baseline stays untouched; the caps keep account sizes stable on long runs.
export const mine = { qrCodes: [], shortUrls: [], tags: [], templates: [] };
export const CAPS = { qrCodes: 8, shortUrls: 5, tags: 4, templates: 3 };

export function forget(kind, predicate) {
	mine[kind] = mine[kind].filter((item) => !predicate(item));
}

// Short codes stay reserved forever, even after the link is deleted — so they are budgeted.
const shortCodesCreated = new Counter('short_codes_created');
let newCodes = 0;

export function mayCreateCode() {
	return newCodes < NEW_CODES_PER_USER;
}

export function codeCreated() {
	newCodes++;
	shortCodesCreated.add(1);
}
