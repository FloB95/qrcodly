// No-op shim for @clerk/nextjs/server — server-only APIs are not used in desktop renderer.
// Desktop pages use client-side hooks instead.

export function auth() {
	throw new Error('auth() is a server-only API and cannot be used in the desktop renderer.');
}

export function currentUser() {
	throw new Error('currentUser() is a server-only API and cannot be used in the desktop renderer.');
}

export function clerkClient() {
	throw new Error('clerkClient() is a server-only API and cannot be used in the desktop renderer.');
}

export function clerkMiddleware() {
	throw new Error(
		'clerkMiddleware() is a server-only API and cannot be used in the desktop renderer.',
	);
}

export function createRouteMatcher() {
	throw new Error(
		'createRouteMatcher() is a server-only API and cannot be used in the desktop renderer.',
	);
}
