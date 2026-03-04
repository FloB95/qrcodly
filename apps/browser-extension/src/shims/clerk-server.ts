// No-op shim for @clerk/nextjs/server — server-only APIs are not used in the extension.

export function auth() {
	throw new Error('auth() is a server-only API and cannot be used in the browser extension.');
}

export function currentUser() {
	throw new Error(
		'currentUser() is a server-only API and cannot be used in the browser extension.',
	);
}

export function clerkClient() {
	throw new Error(
		'clerkClient() is a server-only API and cannot be used in the browser extension.',
	);
}

export function clerkMiddleware() {
	throw new Error(
		'clerkMiddleware() is a server-only API and cannot be used in the browser extension.',
	);
}

export function createRouteMatcher() {
	throw new Error(
		'createRouteMatcher() is a server-only API and cannot be used in the browser extension.',
	);
}
