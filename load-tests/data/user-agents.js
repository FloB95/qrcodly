// =============================================================================
// Scanner fingerprints for the public /u/<code> scan simulation: ~70% phones,
// different browsers, languages and referrers.
// =============================================================================

import { chance, pick } from './random.js';

const MOBILE_USER_AGENTS = [
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.7 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.7258.76 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 14; 23117RA68G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
	'Mozilla/5.0 (Android 15; Mobile; rv:142.0) Gecko/142.0 Firefox/142.0',
];

const DESKTOP_USER_AGENTS = [
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
];

const LANGUAGES = [
	'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
	'de-DE,de;q=0.9',
	'de-AT,de;q=0.9,en;q=0.8',
	'en-US,en;q=0.9',
	'en-GB,en;q=0.9,de;q=0.8',
	'fr-FR,fr;q=0.9,en;q=0.8',
	'es-ES,es;q=0.9,en;q=0.8',
	'it-IT,it;q=0.9,en;q=0.8',
	'nl-NL,nl;q=0.9,en;q=0.8',
	'pl-PL,pl;q=0.9,en;q=0.8',
];

// QR scans are mostly direct (camera app), a few come from shared links.
const REFERRERS = ['', '', '', '', '', '', 'https://www.google.com/', 'https://www.instagram.com/'];

export function scanHeaders(runId) {
	const userAgent = chance(0.7) ? pick(MOBILE_USER_AGENTS) : pick(DESKTOP_USER_AGENTS);
	const headers = {
		'User-Agent': `${userAgent} qrcodly-loadtest/${runId}`,
		'Accept-Language': pick(LANGUAGES),
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	};
	const referrer = pick(REFERRERS);
	if (referrer) headers.Referer = referrer;
	return headers;
}
