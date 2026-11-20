export const MAX_CONSECUTIVE_FAILURES = 10;

/** Total views of a short URL, cached because Umami is slow; every scan clears it */
export const SHORT_URL_VIEWS_CACHE_KEY_PREFIX = 'views:';
export const SHORT_URL_VIEWS_CACHE_TTL_SECONDS = 3600;

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
