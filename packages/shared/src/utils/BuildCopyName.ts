const COPY_PREFIX_PATTERN = /^\(Copy(?: (\d+))?\) /;

/**
 * Builds a duplicated entity name. First duplication adds "(Copy) "; subsequent
 * duplications increment a counter ("(Copy 2) ", "(Copy 3) ", ...) instead of
 * stacking prefixes. The result is truncated to fit `maxLength`.
 */
export function buildCopyName(originalName: string | null | undefined, maxLength: number): string {
	const base = (originalName ?? '').trim();
	const match = base.match(COPY_PREFIX_PATTERN);

	let prefix: string;
	let body: string;

	if (match) {
		const counter = match[1] ? Number.parseInt(match[1], 10) + 1 : 2;
		prefix = `(Copy ${counter}) `;
		body = base.slice(match[0].length);
	} else {
		prefix = '(Copy) ';
		body = base;
	}

	const available = Math.max(0, maxLength - prefix.length);
	return `${prefix}${body.slice(0, available)}`;
}
