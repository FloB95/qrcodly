// =============================================================================
// Test data generators for realistic payloads
// =============================================================================

import { randomString, uniqueName, randomItem, randomHexColor, randomInt } from '../helpers.js';

// --- QR Code Payloads ---

const DOT_TYPES = ['dots', 'rounded', 'classy', 'classy-rounded', 'square', 'extra-rounded'];
const CORNER_SQUARE_TYPES = ['dot', 'square', 'extra-rounded'];
const CORNER_DOT_TYPES = ['dot', 'square'];

function hexStyle(color) {
	return { type: 'hex', value: color || randomHexColor() };
}

function defaultConfig() {
	return {
		width: 300,
		height: 300,
		margin: 10,
		imageOptions: { hideBackgroundDots: true },
		dotsOptions: {
			type: randomItem(DOT_TYPES),
			style: hexStyle(randomHexColor()),
		},
		cornersSquareOptions: {
			type: randomItem(CORNER_SQUARE_TYPES),
			style: hexStyle(randomHexColor()),
		},
		cornersDotOptions: {
			type: randomItem(CORNER_DOT_TYPES),
			style: hexStyle(randomHexColor()),
		},
		backgroundOptions: {
			style: hexStyle('#ffffff'),
		},
	};
}

export function createUrlQrCode() {
	return {
		name: uniqueName('qr'),
		config: defaultConfig(),
		content: {
			type: 'url',
			data: {
				url: `https://example.com/${randomString(10)}`,
				isDynamic: Math.random() > 0.5,
			},
		},
	};
}

export function createTextQrCode() {
	return {
		name: uniqueName('qr'),
		config: defaultConfig(),
		content: {
			type: 'text',
			data: `Load test message ${randomString(20)}`,
		},
	};
}

export function createWifiQrCode() {
	return {
		name: uniqueName('qr'),
		config: defaultConfig(),
		content: {
			type: 'wifi',
			data: {
				ssid: `TestNetwork-${randomString(4)}`,
				password: randomString(12),
				encryption: randomItem(['WPA', 'WEP', 'nopass']),
			},
		},
	};
}

export function createEmailQrCode() {
	return {
		name: uniqueName('qr'),
		config: defaultConfig(),
		content: {
			type: 'email',
			data: {
				email: `test-${randomString(5)}@example.com`,
				subject: `Load Test ${randomString(8)}`,
				body: `This is a load test email body ${randomString(20)}`,
			},
		},
	};
}

export function createVCardQrCode() {
	return {
		name: uniqueName('qr'),
		config: defaultConfig(),
		content: {
			type: 'vCard',
			data: {
				firstName: `Test${randomString(4)}`,
				lastName: `User${randomString(4)}`,
				email: `test-${randomString(5)}@example.com`,
				phone: `+49170${randomInt(1000000, 9999999)}`,
				company: `K6 Corp ${randomString(3)}`,
			},
		},
	};
}

export function createLocationQrCode() {
	return {
		name: uniqueName('qr'),
		config: defaultConfig(),
		content: {
			type: 'location',
			data: {
				address: `${randomInt(1, 999)} Test Street, Berlin`,
				latitude: 52.52 + randomInt(0, 100) / 1000,
				longitude: 13.405 + randomInt(0, 100) / 1000,
			},
		},
	};
}

/**
 * Generate a random QR code creation payload (mixed content types)
 */
export function randomQrCodePayload() {
	const generators = [
		createUrlQrCode,
		createTextQrCode,
		createWifiQrCode,
		createEmailQrCode,
		createVCardQrCode,
		createLocationQrCode,
	];
	return randomItem(generators)();
}

// --- Short URL Payloads ---

export function createShortUrlPayload() {
	return {
		destinationUrl: `https://example.com/page/${randomString(10)}`,
		name: uniqueName('url'),
		isActive: true,
	};
}

export function updateShortUrlPayload() {
	return {
		destinationUrl: `https://example.com/updated/${randomString(10)}`,
	};
}

// --- Config Template Payloads ---

export function createConfigTemplatePayload() {
	return {
		name: uniqueName('tpl'),
		config: defaultConfig(),
	};
}

export function updateConfigTemplatePayload() {
	return {
		name: uniqueName('tpl-upd'),
	};
}

// --- Tag Payloads ---

const TAG_COLORS = [
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#3b82f6',
	'#8b5cf6',
	'#ec4899',
	'#06b6d4',
];

export function createTagPayload() {
	return {
		name: uniqueName('tag'),
		color: randomItem(TAG_COLORS),
	};
}

export function updateTagPayload() {
	return {
		name: uniqueName('tag-upd'),
		color: randomItem(TAG_COLORS),
	};
}
