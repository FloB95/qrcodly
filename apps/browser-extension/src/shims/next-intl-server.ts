// No-op shim for next-intl/server — server-only APIs.

export function getTranslations() {
	throw new Error(
		'getTranslations() is a server-only API and cannot be used in the browser extension.',
	);
}

export function getRequestConfig() {
	throw new Error(
		'getRequestConfig() is a server-only API and cannot be used in the browser extension.',
	);
}

export function getMessages() {
	throw new Error(
		'getMessages() is a server-only API and cannot be used in the browser extension.',
	);
}
