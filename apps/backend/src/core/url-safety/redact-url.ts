/**
 * Reduces a URL to its hostname.
 *
 * Nothing in the safety subsystem may persist or log a full user-supplied URL: paths and query
 * strings routinely carry tokens, session ids and personal data. Every incident row, log line,
 * metric label and email goes through this first.
 */
export function redactToHost(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return '[invalid-url]';
	}
}
