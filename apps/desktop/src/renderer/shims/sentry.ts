// No-op shim for @sentry/nextjs in desktop renderer
export function captureException(error: unknown, _context?: Record<string, unknown>) {
	console.error('[Sentry no-op]', error);
}

export function captureMessage(message: string) {
	console.log('[Sentry no-op]', message);
}

export function withScope(callback: (scope: unknown) => void) {
	callback({
		setTag() {},
		setExtra() {},
		setContext() {},
		setLevel() {},
	});
}

export function setTag() {}
export function setUser() {}
export function setExtra() {}
export function setContext() {}
export function addBreadcrumb() {}
export function startSpan() {}

export default {
	captureException,
	captureMessage,
	withScope,
	setTag,
	setUser,
	setExtra,
	setContext,
	addBreadcrumb,
	startSpan,
};
