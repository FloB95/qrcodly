import { env } from '@/core/config/env';

const SHORT_URL_ORIGIN = env.SHORT_URL_BASE_URL ?? env.FRONTEND_URL;

export const SHORT_BASE_URL = `${SHORT_URL_ORIGIN}/u/`;
export const DYNAMIC_QR_BASE_URL = `${env.FRONTEND_URL}/api/dynamic-qr/`;

/**
 * Redis sorted set of recently scanned short codes, bumped on every scan and read by the safety
 * re-check job to check busy links more often than dormant ones.
 */
export const HOT_SHORT_CODES_KEY = 'url_safety:hot_short_codes';

export const DESKTOP_OS = [
	'BeOS',
	'Chrome OS',
	'Linux',
	'Mac OS',
	'Open BSD',
	'OS/2',
	'QNX',
	'Sun OS',
	'Windows 10',
	'Windows 2000',
	'Windows 3.11',
	'Windows 7',
	'Windows 8',
	'Windows 8.1',
	'Windows 95',
	'Windows 98',
	'Windows ME',
	'Windows Server 2003',
	'Windows Vista',
	'Windows XP',
];

export const MOBILE_OS = ['Amazon OS', 'Android OS', 'BlackBerry OS', 'iOS', 'Windows Mobile'];

export const OS_NAMES = {
	'Android OS': 'Android',
	'Chrome OS': 'ChromeOS',
	'Mac OS': 'macOS',
	'Sun OS': 'SunOS',
	'Windows 10': 'Windows 10/11',
};

export const DEVICES = {
	desktop: 'Desktop',
	mobile: 'Mobile',
	tablet: 'Tablet',
	laptop: 'Laptop',
};

export const BROWSERS = {
	android: 'Android',
	aol: 'AOL',
	beaker: 'Beaker',
	bb10: 'BlackBerry 10',
	chrome: 'Chrome',
	'chromium-webview': 'Chrome (webview)',
	crios: 'Chrome (iOS)',
	curl: 'Curl',
	edge: 'Edge',
	'edge-chromium': 'Edge (Chromium)',
	'edge-ios': 'Edge (iOS)',
	facebook: 'Facebook',
	firefox: 'Firefox',
	fxios: 'Firefox (iOS)',
	ie: 'IE',
	instagram: 'Instagram',
	ios: 'iOS',
	'ios-webview': 'iOS (webview)',
	kakaotalk: 'KakaoTalk',
	miui: 'MIUI',
	opera: 'Opera',
	'opera-mini': 'Opera Mini',
	phantomjs: 'PhantomJS',
	safari: 'Safari',
	samsung: 'Samsung',
	silk: 'Silk',
	searchbot: 'Searchbot',
	yandexbrowser: 'Yandex',
};

// ---------------------------
// URL SAFETY
// ---------------------------

/** Rolling window for the warn→ban ladder. An older last offence resets the counter. */
export const URL_SAFETY_OFFENCE_WINDOW_DAYS = 90;
/**
 * Offences tolerated before a ban. 3 means the first three are blocked and warned about, and only
 * a fourth suspends the account — deliberately generous, because blocking the link already protects
 * visitors and a wrongly banned customer is the more expensive mistake.
 */
export const URL_SAFETY_OFFENCES_BEFORE_BAN = 3;

/** A link is "new" for this long after its last change, and gets checked more often. */
export const URL_SAFETY_NEW_URL_AGE_DAYS = 7;
export const URL_SAFETY_RECHECK_NEW_HOURS = 24;
export const URL_SAFETY_RECHECK_ESTABLISHED_DAYS = 7;
/** Short backoff after an `unknown` verdict, so an outage delays but never skips a link. */
export const URL_SAFETY_UNKNOWN_BACKOFF_HOURS = 6;
/** Gap between the first unsafe hit and the confirming lookup that actually blocks. */
export const URL_SAFETY_CONFIRMATION_DELAY_HOURS = 1;

/**
 * Links screened per daily run — both the throughput budget and the cost ceiling.
 *
 * Throughput: a corpus of N links on the 7-day established cycle needs roughly N/7 lookups a day.
 * At 500 a 10k corpus would fall behind by ~1.1k/day and the backlog would grow forever; watch
 * `url_safety.recheck.backlog` and raise this if it climbs.
 *
 * Cost: Google Web Risk `uris.search` is free up to 100k calls/month, then $0.50 per 1k. 3000/day
 * is 90k/month, so a full corpus sweep stays inside the free tier. Raising this past ~3300/day is
 * the point where the feature starts costing money.
 */
export const URL_SAFETY_RECHECK_BATCH_SIZE = 3000;
/**
 * Parallel lookups. At 5 a full 3000-link batch would exactly exhaust the 480s budget if Web Risk
 * answers slowly (~800ms); 8 keeps a comfortable margin. The wall-clock guard makes overrun
 * harmless anyway — the run just stops and the rest carries to tomorrow.
 */
export const URL_SAFETY_RECHECK_CONCURRENCY = 8;
/**
 * Must stay strictly below the 600s Redis lock TTL hard-coded in AbstractCronJob — a run that
 * outlives its lock deletes the lock of the run that replaced it.
 */
export const URL_SAFETY_RECHECK_MAX_RUNTIME_MS = 8 * 60 * 1000;
/** Blast-radius cap: stop blocking and alarm instead, so a bad list can't disable the corpus. */
export const URL_SAFETY_BLOCK_CAP_PER_RUN = 25;
export const URL_SAFETY_HOT_SHORT_CODE_LIMIT = 200;

/**
 * Threat types that justify disabling an existing, working link. UNWANTED_SOFTWARE is deliberately
 * absent — it fires on legitimate download sites too often to break a printed QR code over.
 * The synchronous create/update path still refuses all three; there it is the user's own choice.
 */
export const URL_SAFETY_BLOCKING_THREAT_TYPES: readonly string[] = [
	'SOCIAL_ENGINEERING',
	'MALWARE',
];

export const URL_SAFETY_INCIDENT_RETENTION_DAYS = 365;
