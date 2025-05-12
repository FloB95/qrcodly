import { env } from '@/core/config/env';

export const SHORT_BASE_URL = `${env.FRONTEND_URL}/u/`;

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
