export type ParsedQrContent =
	| { type: 'url'; url: string; hostname: string; isShortLink: boolean }
	| {
			type: 'wifi';
			ssid: string;
			password: string | null;
			encryption: string | null;
			hidden: boolean;
	  }
	| {
			type: 'vcard';
			name: string | null;
			organization: string | null;
			jobTitle: string | null;
			phones: string[];
			emails: string[];
			websites: string[];
			address: string | null;
			note: string | null;
			vcf: string;
	  }
	| { type: 'email'; to: string; subject: string | null; body: string | null }
	| { type: 'phone'; number: string }
	| { type: 'sms'; number: string; message: string | null }
	| { type: 'geo'; latitude: number; longitude: number }
	| { type: 'text'; text: string };

export type QrContentType = ParsedQrContent['type'];

/** Hosts whose links hide their final destination behind a redirect. */
const SHORT_LINK_HOSTS = new Set([
	'bit.ly',
	'bitly.com',
	't.co',
	'tinyurl.com',
	'goo.gl',
	'ow.ly',
	'is.gd',
	'v.gd',
	'buff.ly',
	'cutt.ly',
	'rebrand.ly',
	'shorturl.at',
	't.ly',
	'lnkd.in',
	's.id',
	'rb.gy',
	'tiny.cc',
	'tiny.one',
	'short.io',
	'bl.ink',
	'qrco.de',
	'qr.io',
	'me-qr.com',
	'qrcd.org',
	'qrs.ly',
	'qr1.be',
	'qrfy.io',
	'snip.ly',
	'shorte.st',
	'adf.ly',
	'soo.gd',
	'x.co',
	'po.st',
	'clck.ru',
	'vk.cc',
	'dlvr.it',
	'trib.al',
	'fb.me',
	'kutt.it',
	'short.gy',
	'u.nu',
	'tr.im',
]);

export function parseQrContent(raw: string): ParsedQrContent {
	const value = raw.trim();
	const upper = value.toUpperCase();

	if (upper.startsWith('WIFI:')) return parseWifi(value);
	if (upper.startsWith('BEGIN:VCARD')) return parseVCard(value);
	if (upper.startsWith('MECARD:')) return parseMeCard(value);
	if (upper.startsWith('MAILTO:')) return parseMailto(value);
	if (upper.startsWith('TEL:')) return { type: 'phone', number: safeDecode(value.slice(4)) };
	if (upper.startsWith('SMSTO:') || upper.startsWith('SMS:')) return parseSms(value);
	if (upper.startsWith('GEO:')) {
		const geo = parseGeo(value);
		if (geo) return geo;
	}

	return parseUrl(value) ?? { type: 'text', text: value };
}

function parseUrl(value: string): ParsedQrContent | null {
	const candidate = /^www\./i.test(value) ? `https://${value}` : value;
	if (!/^https?:\/\/\S+$/i.test(candidate)) return null;

	let url: URL;
	try {
		url = new URL(candidate);
	} catch {
		return null;
	}

	const hostname = url.hostname.replace(/^www\./, '');
	return {
		type: 'url',
		url: candidate,
		hostname: url.hostname,
		isShortLink: SHORT_LINK_HOSTS.has(hostname),
	};
}

/** Splits on unescaped separators and resolves backslash escapes (used by WIFI and MECARD). */
function splitEscaped(input: string, separator: string): string[] {
	const parts: string[] = [];
	let current = '';
	for (let i = 0; i < input.length; i++) {
		const char = input[i];
		if (char === '\\' && i + 1 < input.length) {
			current += input[i + 1];
			i++;
		} else if (char === separator) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	parts.push(current);
	return parts;
}

function toKeyValueMap(fields: string[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const field of fields) {
		const colon = field.indexOf(':');
		if (colon <= 0) continue;
		const key = field.slice(0, colon).trim().toUpperCase();
		if (!map.has(key)) map.set(key, field.slice(colon + 1));
	}
	return map;
}

function parseWifi(value: string): ParsedQrContent {
	const fields = toKeyValueMap(splitEscaped(value.slice(5), ';'));
	const type = (fields.get('T') ?? '').trim();
	const password = fields.get('P') ?? '';
	const isOpen = type === '' || type.toLowerCase() === 'nopass';

	return {
		type: 'wifi',
		ssid: fields.get('S') ?? '',
		password: isOpen || password === '' ? null : password,
		encryption: isOpen ? null : type,
		hidden: (fields.get('H') ?? '').trim().toLowerCase() === 'true',
	};
}

function unfoldLines(value: string): string[] {
	const lines: string[] = [];
	for (const line of value.split(/\r?\n/)) {
		if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
			lines[lines.length - 1] += line.slice(1);
		} else {
			lines.push(line);
		}
	}
	return lines;
}

function unescapeVCardText(value: string): string {
	return value
		.replace(/\\n/gi, '\n')
		.replace(/\\,/g, ',')
		.replace(/\\;/g, ';')
		.replace(/\\\\/g, '\\')
		.trim();
}

function joinVCardParts(value: string, order?: number[]): string {
	const parts = value.split(';').map(unescapeVCardText);
	const ordered = order ? order.map((i) => parts[i] ?? '') : parts;
	return ordered.filter(Boolean).join(order ? ' ' : ', ');
}

function pushUnique(list: string[], entry: string | null) {
	const cleaned = entry?.trim() ?? '';
	if (cleaned && !list.includes(cleaned)) list.push(cleaned);
}

/** Only http(s) websites become links; anything else stays visible in the raw content. */
function toSafeWebsite(value: string): string | null {
	const candidate = /^www\./i.test(value.trim()) ? `https://${value.trim()}` : value.trim();
	try {
		const url = new URL(candidate);
		return url.protocol === 'http:' || url.protocol === 'https:' ? candidate : null;
	} catch {
		return null;
	}
}

function parseVCard(value: string): ParsedQrContent {
	let name: string | null = null;
	let structuredName: string | null = null;
	let organization: string | null = null;
	let jobTitle: string | null = null;
	let address: string | null = null;
	let note: string | null = null;
	const phones: string[] = [];
	const emails: string[] = [];
	const websites: string[] = [];

	for (const line of unfoldLines(value)) {
		const colon = line.indexOf(':');
		if (colon <= 0) continue;
		const property = line.slice(0, colon).split(';')[0]!.toUpperCase();
		// Apple exports group properties as "item1.TEL"
		const key = property.includes('.') ? property.slice(property.indexOf('.') + 1) : property;
		const body = line.slice(colon + 1);

		switch (key) {
			case 'FN':
				name ??= unescapeVCardText(body);
				break;
			case 'N':
				// Family;Given;Additional;Prefix;Suffix
				structuredName ??= joinVCardParts(body, [3, 1, 2, 0, 4]);
				break;
			case 'ORG':
				organization ??= joinVCardParts(body);
				break;
			case 'TITLE':
				jobTitle ??= unescapeVCardText(body);
				break;
			case 'TEL':
				pushUnique(phones, unescapeVCardText(body).replace(/^tel:/i, ''));
				break;
			case 'EMAIL':
				pushUnique(emails, unescapeVCardText(body));
				break;
			case 'URL':
				pushUnique(websites, toSafeWebsite(unescapeVCardText(body)));
				break;
			case 'ADR':
				address ??= joinVCardParts(body);
				break;
			case 'NOTE':
				note ??= unescapeVCardText(body);
				break;
		}
	}

	return {
		type: 'vcard',
		name: name || structuredName || null,
		organization: organization || null,
		jobTitle: jobTitle || null,
		phones,
		emails,
		websites,
		address: address || null,
		note: note || null,
		vcf: value,
	};
}

function escapeVCardText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n');
}

function parseMeCard(value: string): ParsedQrContent {
	const fields = splitEscaped(value.slice(7), ';');
	const phones: string[] = [];
	const emails: string[] = [];
	const websites: string[] = [];
	let rawName = '';
	let organization = '';
	let address = '';
	let note = '';

	for (const field of fields) {
		const colon = field.indexOf(':');
		if (colon <= 0) continue;
		const key = field.slice(0, colon).trim().toUpperCase();
		const body = field.slice(colon + 1);
		switch (key) {
			case 'N':
				rawName ||= body;
				break;
			case 'ORG':
				organization ||= body;
				break;
			case 'TEL':
			case 'TEL-AV':
				pushUnique(phones, body);
				break;
			case 'EMAIL':
				pushUnique(emails, body);
				break;
			case 'URL':
				pushUnique(websites, toSafeWebsite(body));
				break;
			case 'ADR':
				address ||= body;
				break;
			case 'NOTE':
				note ||= body;
				break;
		}
	}

	// MECARD names are "Family,Given"
	const [family = '', given = ''] = rawName.split(',').map((part) => part.trim());
	const name = [given, family].filter(Boolean).join(' ');

	const vcfLines = [
		'BEGIN:VCARD',
		'VERSION:3.0',
		`N:${escapeVCardText(family)};${escapeVCardText(given)};;;`,
		`FN:${escapeVCardText(name)}`,
		organization && `ORG:${escapeVCardText(organization)}`,
		...phones.map((phone) => `TEL:${escapeVCardText(phone)}`),
		...emails.map((email) => `EMAIL:${escapeVCardText(email)}`),
		...websites.map((url) => `URL:${escapeVCardText(url)}`),
		address && `ADR:;;${escapeVCardText(address)};;;;`,
		note && `NOTE:${escapeVCardText(note)}`,
		'END:VCARD',
	].filter(Boolean);

	return {
		type: 'vcard',
		name: name || null,
		organization: organization || null,
		jobTitle: null,
		phones,
		emails,
		websites,
		address: address || null,
		note: note || null,
		vcf: vcfLines.join('\r\n'),
	};
}

function parseMailto(value: string): ParsedQrContent {
	const rest = value.slice(7);
	const question = rest.indexOf('?');
	const to = safeDecode(question >= 0 ? rest.slice(0, question) : rest);
	const params = new URLSearchParams(question >= 0 ? rest.slice(question + 1) : '');

	return {
		type: 'email',
		to,
		subject: params.get('subject') || null,
		body: params.get('body') || null,
	};
}

function parseSms(value: string): ParsedQrContent {
	const rest = value.slice(value.indexOf(':') + 1);
	const question = rest.indexOf('?');
	if (question >= 0) {
		const params = new URLSearchParams(rest.slice(question + 1));
		return {
			type: 'sms',
			number: safeDecode(rest.slice(0, question)),
			message: params.get('body') || null,
		};
	}

	const colon = rest.indexOf(':');
	if (colon >= 0) {
		return {
			type: 'sms',
			number: rest.slice(0, colon).trim(),
			message: rest.slice(colon + 1) || null,
		};
	}
	return { type: 'sms', number: rest.trim(), message: null };
}

function parseGeo(value: string): ParsedQrContent | null {
	const match = /^geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i.exec(value);
	if (!match) return null;

	const latitude = Number.parseFloat(match[1]!);
	const longitude = Number.parseFloat(match[2]!);
	if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
	// "geo:0,0?q=…" carries a search query, not a position
	if (latitude === 0 && longitude === 0 && /\?q=/i.test(value)) return null;

	return { type: 'geo', latitude, longitude };
}

function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value).trim();
	} catch {
		return value.trim();
	}
}
