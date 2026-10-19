// =============================================================================
// Request bodies shaped like what the generator, short-URL dialog, tag and
// template forms send. Validated against the shared Zod DTOs by the self-check
// described in the README — keep them in sync when the schemas change.
// =============================================================================

import { chance, pick, randomId, randomInt, weighted } from './random.js';

const DOT_TYPES = ['dots', 'rounded', 'classy', 'classy-rounded', 'square', 'extra-rounded'];
const CORNER_SQUARE_TYPES = ['dot', 'square', 'extra-rounded'];
const CORNER_DOT_TYPES = ['dot', 'square'];
const COLORS = ['#000000', '#1E3A8A', '#0F766E', '#7C3AED', '#B91C1C', '#C2410C', '#15803D'];
const TAG_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];

// Rough mix of what people generate; dynamic URL codes dominate because they are the product.
const CONTENT_TYPES = [
	['url', 55],
	['vCard', 12],
	['text', 8],
	['wifi', 8],
	['email', 5],
	['location', 4],
	['event', 4],
	['epc', 4],
];

// A small pool keeps the backend's 5-minute Web Risk cache warm, so the test does not turn
// into thousands of billable Google lookups. UNIQUE_URLS=1 switches to one URL per request.
const URL_POOL_SIZE = 25;

export function destinationUrl(unique = false) {
	const path = unique ? randomId(12) : randomInt(1, URL_POOL_SIZE);
	return `https://example.com/qrcodly-loadtest/${path}`;
}

function color(value) {
	return { type: 'hex', value };
}

export function qrConfig() {
	const main = pick(COLORS);
	const dots = chance(0.15)
		? {
				type: 'gradient',
				gradientType: pick(['linear', 'radial']),
				rotation: 0,
				colorStops: [
					{ offset: 0, color: main },
					{ offset: 1, color: pick(COLORS) },
				],
			}
		: color(main);

	return {
		width: 1000,
		height: 1000,
		margin: 0,
		image: '',
		imageOptions: { hideBackgroundDots: true },
		dotsOptions: { type: pick(DOT_TYPES), style: dots },
		cornersSquareOptions: { type: pick(CORNER_SQUARE_TYPES), style: color(main) },
		cornersDotOptions: { type: pick(CORNER_DOT_TYPES), style: color(main) },
		backgroundOptions: { style: color('#FFFFFF') },
	};
}

function eventDates() {
	const start = new Date(Date.now() + randomInt(2, 90) * 86400000);
	start.setUTCHours(randomInt(8, 19), 0, 0, 0);
	const end = new Date(start.getTime() + randomInt(1, 4) * 3600000);
	return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function qrContent(type, { dynamic, unique = false } = {}) {
	const id = randomId(6);
	switch (type) {
		case 'url':
			return {
				type,
				data: { url: destinationUrl(unique), isDynamic: dynamic ?? chance(0.65) },
			};
		case 'text':
			return { type, data: `Table ${randomInt(1, 40)} — ask for the lunch menu (${id})` };
		case 'wifi':
			return chance(0.2)
				? { type, data: { ssid: `Guest-${id}`, password: '', encryption: 'nopass' } }
				: { type, data: { ssid: `Office-${id}`, password: randomId(14), encryption: 'WPA' } };
		case 'vCard':
			return {
				type,
				data: {
					firstName: pick(['Anna', 'Jonas', 'Lea', 'Felix', 'Mia', 'Paul']),
					lastName: `Test-${id}`,
					email: `contact-${id}@example.com`,
					phoneMobile: `+49170${randomInt(1000000, 9999999)}`,
					company: 'Loadtest GmbH',
					job: pick(['Sales', 'Marketing', 'Support', 'Engineering']),
					website: `https://example.com/team/${id}`,
					isDynamic: dynamic ?? chance(0.3),
				},
			};
		case 'email':
			return {
				type,
				data: {
					email: `hello-${id}@example.com`,
					subject: `Request ${id}`,
					body: 'Hi, I scanned your QR code and would like to know more.',
				},
			};
		case 'location':
			return {
				type,
				data: {
					address: `Teststraße ${randomInt(1, 200)}, 10115 Berlin`,
					latitude: 52.4 + Math.random() * 0.2,
					longitude: 13.3 + Math.random() * 0.2,
				},
			};
		case 'event':
			return {
				type,
				data: {
					title: `Open House ${id}`,
					description: 'Load test event',
					location: 'Berlin',
					url: destinationUrl(unique),
					...eventDates(),
				},
			};
		case 'epc':
			return {
				type,
				data: {
					name: 'Loadtest GmbH',
					iban: 'DE89370400440532013000',
					bic: 'COBADEFFXXX',
					amount: randomInt(100, 50000) / 100,
					purpose: `Invoice ${id}`,
				},
			};
		default:
			throw new Error(`unknown content type ${type}`);
	}
}

// Event codes always get a short link (landing page), so they count as dynamic.
const STATIC_CONTENT_TYPES = CONTENT_TYPES.filter(([type]) => type !== 'event');

/** `allowDynamic: false` guarantees the QR code does not mint a short code. */
export function qrCodePayload(name, { type, dynamic, unique = false, allowDynamic = true } = {}) {
	const contentType = type ?? weighted(allowDynamic ? CONTENT_TYPES : STATIC_CONTENT_TYPES);
	const content = qrContent(contentType, { dynamic: allowDynamic ? dynamic : false, unique });
	return { name, config: qrConfig(), content };
}

/**
 * What people change on the edit page: mostly the name or the look, sometimes the target.
 * Pass `name: null` for seeded codes — they keep their name so cleanup can recognise them.
 */
export function qrCodeUpdate(qrCode, name, unique = false) {
	const roll = Math.random();
	if (roll < 0.45 && name) return { name };

	const type = qrCode.content && qrCode.content.type;
	if (roll < 0.65 && type === 'url') {
		const isDynamic = !!(qrCode.content.data && qrCode.content.data.isDynamic);
		return { content: qrContent('url', { dynamic: isDynamic, unique }) };
	}
	if (roll < 0.65 && type === 'text') return { content: qrContent('text') };

	return { config: qrConfig() };
}

export function shortUrlPayload(name, unique = false) {
	return { destinationUrl: destinationUrl(unique), name, isActive: true };
}

export function shortUrlUpdate(name, unique = false) {
	return chance(0.6) || !name ? { destinationUrl: destinationUrl(unique) } : { name };
}

export function tagPayload(name) {
	return { name: name.slice(0, 32), color: pick(TAG_COLORS) };
}

export function tagUpdate(name) {
	return chance(0.5) ? { name: name.slice(0, 32) } : { color: pick(TAG_COLORS) };
}

export function templatePayload(name) {
	return { name, config: qrConfig() };
}

export function templateUpdate(name) {
	return chance(0.5) ? { name } : { config: qrConfig() };
}

// Seed data carries fixed names: seeding stays idempotent and cleanup can keep it.
export const SEED_NAMES = {
	qrCode: (n) => `lt-seed-${n}`,
	link: (n) => `lt-seed-link-${n}`,
	template: (n) => `lt-seed-template-${n}`,
	tag: (n) => `seed-${n}`,
};

export function isSeedName(name) {
	return /^(lt-seed-(link-|template-)?\d+|seed-\d+)$/.test(name || '');
}

/**
 * Baseline account content created once by `./run.sh seed`, cycled when SEED_QR_CODES > 8.
 * Only the first two mint short codes — enough for view counts, analytics and scans.
 */
export const SEED_QR_CODES = [
	{ type: 'url', dynamic: true },
	{ type: 'url', dynamic: true },
	{ type: 'url', dynamic: false },
	{ type: 'vCard', dynamic: false },
	{ type: 'wifi' },
	{ type: 'url', dynamic: false },
	{ type: 'text' },
	{ type: 'email' },
];
