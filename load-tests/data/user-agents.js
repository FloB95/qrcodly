// =============================================================================
// Realistic User-Agent strings for scan simulation
// Mix of mobile & desktop, various browsers, OS versions, and countries
// =============================================================================

import { randomItem, randomInt } from '../helpers.js';

// --- Mobile User-Agents (70% of QR scans come from mobile) ---

const MOBILE_USER_AGENTS = [
	// iPhone Safari (various models & iOS versions)
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.7 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.103 Mobile/15E148 Safari/604.1',

	// iPad Safari
	'Mozilla/5.0 (iPad; CPU OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
	'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',

	// Android Chrome (various devices)
	'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.100 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 14; Redmi Note 13 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36',
	'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.6167.143 Mobile Safari/537.36',

	// Android Firefox
	'Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0',
	'Mozilla/5.0 (Android 13; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',

	// Huawei Browser
	'Mozilla/5.0 (Linux; Android 12; HarmonyOS; ANA-NX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/14.0 Mobile Safari/537.36',
];

// --- Desktop User-Agents (30% of scans) ---

const DESKTOP_USER_AGENTS = [
	// Chrome (Windows)
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',

	// Chrome (macOS)
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',

	// Firefox (Windows)
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',

	// Firefox (macOS)
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',

	// Safari (macOS)
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',

	// Edge (Windows)
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70',

	// Chrome (Linux)
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

// --- Accept-Language headers (simulates users from different countries) ---

const LANGUAGES = [
	'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
	'de,en-US;q=0.7,en;q=0.3',
	'en-US,en;q=0.9',
	'en-GB,en;q=0.9,de;q=0.8',
	'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
	'es-ES,es;q=0.9,en;q=0.8',
	'it-IT,it;q=0.9,en;q=0.8',
	'nl-NL,nl;q=0.9,en;q=0.8',
	'pl-PL,pl;q=0.9,en;q=0.8',
	'ru-RU,ru;q=0.9,en;q=0.8',
	'pt-BR,pt;q=0.9,en;q=0.8',
	'ja-JP,ja;q=0.9,en;q=0.8',
	'zh-CN,zh;q=0.9,en;q=0.8',
	'tr-TR,tr;q=0.9,en;q=0.8',
	'ar-SA,ar;q=0.9,en;q=0.8',
	'ko-KR,ko;q=0.9,en;q=0.8',
];

// --- Referrers (where the scan "came from") ---

const REFERRERS = [
	'', // direct scan (most common for QR)
	'',
	'',
	'',
	'',
	'https://www.google.com/',
	'https://www.google.de/',
	'https://t.co/',
	'https://www.facebook.com/',
	'https://www.instagram.com/',
	'https://www.linkedin.com/',
];

// --- Random IP generator ---

function randomIp() {
	return `${randomInt(1, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

/**
 * Generate a realistic scan request profile
 * 70% mobile, 30% desktop — matching real QR code scan patterns
 */
export function randomScanProfile() {
	const isMobile = Math.random() < 0.7;
	const userAgent = isMobile ? randomItem(MOBILE_USER_AGENTS) : randomItem(DESKTOP_USER_AGENTS);

	return {
		userAgent,
		language: randomItem(LANGUAGES),
		referrer: randomItem(REFERRERS),
		ip: randomIp(),
	};
}

/**
 * Get all scan-related headers for a request
 */
export function getScanHeaders(profile) {
	const headers = {
		'User-Agent': profile.userAgent,
		'Accept-Language': profile.language,
		'X-Forwarded-For': profile.ip,
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	};

	if (profile.referrer) {
		headers['Referer'] = profile.referrer;
	}

	return headers;
}
