import { env } from '@/core/config/env';

const SHORT_URL_ORIGIN = env.SHORT_URL_BASE_URL ?? env.FRONTEND_URL;

export const SHORT_BASE_URL = `${SHORT_URL_ORIGIN}/u/`;
export const DYNAMIC_QR_BASE_URL = `${env.FRONTEND_URL}/api/dynamic-qr/`;

/** Recently scanned short codes, so busy links get checked more often than dormant ones. */
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
/** 3 = first three offences only warn, the fourth suspends the account. */
export const URL_SAFETY_OFFENCES_BEFORE_BAN = 3;

/** First check after a link is created or repointed — the window a spam campaign runs in. */
export const URL_SAFETY_FIRST_CHECK_MINUTES = 15;

/** A link is "new" for this long after its last change, and gets checked more often. */
export const URL_SAFETY_NEW_URL_AGE_DAYS = 7;
export const URL_SAFETY_RECHECK_NEW_HOURS = 24;
export const URL_SAFETY_RECHECK_ESTABLISHED_DAYS = 7;
/** Short backoff after an `unknown` verdict, so an outage delays but never skips a link. */
export const URL_SAFETY_UNKNOWN_BACKOFF_HOURS = 6;
/** Gap between the first unsafe hit and the confirming lookup that actually blocks. */
export const URL_SAFETY_CONFIRMATION_DELAY_HOURS = 1;

/** Needs ~N/7 per day for a corpus of N. 3000/day = 90k/month, inside Web Risk's free tier. */
export const URL_SAFETY_RECHECK_BATCH_SIZE = 3000;
/** 8 keeps a full batch inside the runtime budget even when Web Risk answers slowly. */
export const URL_SAFETY_RECHECK_CONCURRENCY = 8;
/** Must stay below AbstractCronJob's hard-coded 600s lock TTL. */
export const URL_SAFETY_RECHECK_MAX_RUNTIME_MS = 8 * 60 * 1000;
/** Blast-radius cap: stop blocking and alarm instead, so a bad list can't disable the corpus. */
export const URL_SAFETY_BLOCK_CAP_PER_RUN = 25;
export const URL_SAFETY_HOT_SHORT_CODE_LIMIT = 200;

/** Everything Web Risk reports as harmful blocks. Narrow if false positives show up. */
export const URL_SAFETY_BLOCKING_THREAT_TYPES: readonly string[] = [
	'SOCIAL_ENGINEERING',
	'MALWARE',
	'UNWANTED_SOFTWARE',
];

export const URL_SAFETY_INCIDENT_RETENTION_DAYS = 365;
