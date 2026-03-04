// No-op shim for next-intl/server — server-only APIs.
// Desktop pages use client-side useTranslations() instead.

export function getTranslations() {
	throw new Error(
		'getTranslations() is a server-only API and cannot be used in the desktop renderer.',
	);
}

export function getRequestConfig() {
	throw new Error(
		'getRequestConfig() is a server-only API and cannot be used in the desktop renderer.',
	);
}

export function getMessages() {
	throw new Error('getMessages() is a server-only API and cannot be used in the desktop renderer.');
}
