import { env } from '@/env';
import { serverApiUrl } from '@/lib/server-api-url';
import { scannerIpFrom } from '@/lib/scanner-ip';

type TContext = { params: Promise<{ shortCode: string; documentId: string }> };

/** Request headers the backend may see: caching and ranges, never the visitor's cookies. */
const FORWARDED_REQUEST_HEADERS = ['range', 'if-range', 'if-none-match'];
/** Response headers the visitor gets; everything else from the backend stays internal. */
const FORWARDED_RESPONSE_HEADERS = [
	'content-type',
	'content-length',
	'content-range',
	'accept-ranges',
	'content-disposition',
	'etag',
	'cache-control',
	'content-security-policy',
	'cross-origin-resource-policy',
	'x-content-type-options',
	'x-robots-tag',
	'retry-after',
];
// only until the backend answers: a large PDF on a slow phone must not be cut off mid-download
const HEADERS_TIMEOUT_MS = 10_000;

const plain = (status: number, text: string, headers: Record<string, string> = {}) =>
	new Response(text, {
		status,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store',
			...headers,
		},
	});

/**
 * A document of a hosted page under the page's own address (`/u/<code>/file/<documentId>`), so a
 * visitor never leaves the short URL or custom domain. Streams from the backend, which only
 * answers this server (internal key) and only for the host the page belongs to.
 */
async function forward(request: Request, { params }: TContext, method: 'GET' | 'HEAD') {
	const { shortCode, documentId } = await params;
	const download = new URL(request.url).searchParams.get('download') === '1';

	const headers = new Headers({
		'x-internal-api-key': env.INTERNAL_API_SECRET,
		'x-scanner-ip': scannerIpFrom(request.headers),
		'x-hosted-host': request.headers.get('host') ?? '',
		'accept-encoding': 'identity',
	});
	for (const name of FORWARDED_REQUEST_HEADERS) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}

	const abort = new AbortController();
	request.signal.addEventListener('abort', () => abort.abort());
	const timer = setTimeout(() => abort.abort(), HEADERS_TIMEOUT_MS);
	let upstream: Response;
	try {
		upstream = await fetch(
			`${serverApiUrl()}/hosted-page/by-code/${encodeURIComponent(shortCode)}/files/${encodeURIComponent(documentId)}${download ? '?download=1' : ''}`,
			{ method, headers, cache: 'no-store', signal: abort.signal },
		);
	} catch {
		return plain(503, 'Temporarily unavailable', { 'retry-after': '5' });
	} finally {
		clearTimeout(timer);
	}

	if (upstream.status >= 500 || upstream.status === 401) {
		await upstream.body?.cancel();
		return plain(503, 'Temporarily unavailable', { 'retry-after': '5' });
	}
	if (upstream.status === 404) {
		await upstream.body?.cancel();
		return plain(404, 'Not found');
	}
	if (upstream.status === 429) {
		await upstream.body?.cancel();
		return plain(429, 'Too many requests, please try again in a moment', {
			'retry-after': upstream.headers.get('retry-after') ?? '30',
		});
	}
	// anything else that is not a file (e.g. a refused request) must not show the API's error body
	if (upstream.status >= 400) {
		await upstream.body?.cancel();
		return plain(404, 'Not found');
	}

	const responseHeaders = new Headers();
	for (const name of FORWARDED_RESPONSE_HEADERS) {
		const value = upstream.headers.get(name);
		if (value) responseHeaders.set(name, value);
	}
	const body = method === 'HEAD' || upstream.status === 304 ? null : upstream.body;
	return new Response(body, { status: upstream.status, headers: responseHeaders });
}

export const GET = (request: Request, context: TContext) => forward(request, context, 'GET');
// without its own HEAD, Next would run GET and stream the whole file from storage
export const HEAD = (request: Request, context: TContext) => forward(request, context, 'HEAD');
