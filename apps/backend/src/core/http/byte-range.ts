import { type TByteRange } from '@/core/storage';

/**
 * The single byte range a `Range` header asks for (RFC 9110), so players and PDF viewers can load a
 * large file in parts. Null means "send the whole file": no header, a form we do not serve (several
 * ranges, other units, an invalid range) or an `If-Range` that no longer matches the file.
 */
export function parseByteRange(
	header: string | undefined,
	size: number,
	ifRange?: string,
	etag?: string,
): TByteRange | 'unsatisfiable' | null {
	if (!header) return null;
	if (ifRange !== undefined && ifRange !== etag) return null;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match || (!match[1] && !match[2])) return null;
	const [, startText, endText] = match;

	if (!startText) {
		// the last n bytes
		const suffix = Number(endText);
		if (suffix === 0 || size === 0) return 'unsatisfiable';
		return { start: Math.max(0, size - suffix), end: size - 1 };
	}
	const start = Number(startText);
	if (start >= size) return 'unsatisfiable';
	const end = endText ? Math.min(Number(endText), size - 1) : size - 1;
	return end < start ? null : { start, end };
}
