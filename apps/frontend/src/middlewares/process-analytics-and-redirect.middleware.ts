import { env } from '@/env';
import { serverApiUrl } from '@/lib/server-api-url';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';
import { UAParser } from 'ua-parser-js';

type ScanLookupResponse = {
	destinationUrl: string | null;
	isActive: boolean;
	deletedAt: string | null;
	/**
	 * True when we disabled the link because its destination was flagged as unsafe.
	 *
	 * This type is hand-written and the backend endpoint has no response schema, so nothing here is
	 * type-checked against the API — if this field is ever dropped server-side, blocked links quietly
	 * fall back to /disabled with no build or test failure.
	 */
	blocked?: boolean;
};

// Rollouts and database failovers make the backend unreachable for a few seconds
const LOOKUP_TIMEOUT_MS = 2500;
const RETRY_DELAYS_MS = [300, 1000];

type Lookup =
	| { kind: 'ok'; data: ScanLookupResponse }
	| { kind: 'missing' }
	| { kind: 'unavailable'; reason: string };

async function lookupShortUrl(url: string, headers: Record<string, string>): Promise<Lookup> {
	let reason = '';
	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
		if (attempt > 0) {
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
		}
		try {
			const response = await fetch(url, {
				method: 'GET',
				headers,
				signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
			});
			// A rate limit lasts a minute and a wrong internal secret does not heal: retrying can't help
			if (response.status === 429 || response.status === 401) {
				return { kind: 'unavailable', reason: String(response.status) };
			}
			if (response.status >= 500) {
				reason = String(response.status);
				continue;
			}
			if (!response.ok) {
				return { kind: 'missing' };
			}
			return { kind: 'ok', data: (await response.json()) as ScanLookupResponse };
		} catch (err) {
			// Network error, timeout or a body that broke off mid-response: try again
			reason = err instanceof Error ? err.name : 'error';
		}
	}
	return { kind: 'unavailable', reason };
}

/** Printed codes must never show "not found" just because the backend hiccuped. */
function temporaryErrorResponse() {
	return new NextResponse(
		'<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
			'<meta http-equiv="refresh" content="5"><title>QRcodly</title></head>' +
			'<body style="font-family:sans-serif;text-align:center;padding:3rem 1rem">' +
			'<p>Bitte einen Moment warten, die Seite lädt gleich neu.</p><p>Please wait a moment, this page reloads shortly.</p></body></html>',
		{
			status: 503,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Retry-After': '5',
				'Cache-Control': 'no-store',
			},
		},
	);
}

export async function processAnalyticsAndRedirect(req: NextRequest) {
	const headers = req.headers;
	const rawHostname = headers.get('host') ?? '';
	const cleanedHostname = rawHostname.split(':')[0];
	const hostnameRegex =
		/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
	const hostname =
		cleanedHostname && hostnameRegex.test(cleanedHostname) ? cleanedHostname : 'unknown';

	const userAgent = headers.get('user-agent') ?? '';
	const { browser, device } = UAParser(userAgent);

	// ua-parser models desktop as the *absence* of a device type, so `device.type` is undefined for
	// every desktop browser. Forwarding that as '' made Umami and Matomo record a blank device for
	// roughly a fifth of all scans instead of a desktop one.
	const deviceType = device.type ?? 'desktop';

	const language = headers.get('accept-language')
		? headers.get('accept-language')?.split(',')[0]
		: '';

	// cf-connecting-ip is set by Cloudflare; the first X-Forwarded-For entry can be client-supplied
	const scannerIp =
		headers.get('cf-connecting-ip')?.trim() ||
		headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		'';

	const urlCode = new URL(req.url).pathname.split('/').pop();
	if (!urlCode) {
		return NextResponse.rewrite(new URL('/404', req.url));
	}

	const internalHeaders = {
		'x-internal-api-key': env.INTERNAL_API_SECRET,
		'x-scanner-ip': scannerIp,
	};

	const lookup = await lookupShortUrl(`${serverApiUrl()}/short-url/${urlCode}`, {
		'Content-Type': 'application/json',
		...internalHeaders,
	});
	if (lookup.kind === 'missing') {
		return NextResponse.rewrite(new URL('/404', req.url));
	}
	if (lookup.kind === 'unavailable') {
		// 401 means frontend and backend disagree on INTERNAL_API_SECRET
		(lookup.reason === '401' ? console.error : console.warn)('scan.lookup.unavailable', {
			urlCode,
			reason: lookup.reason,
		});
		return temporaryErrorResponse();
	}

	const shortUrl = lookup.data;
	if (!shortUrl?.destinationUrl || !shortUrl.isActive || shortUrl.deletedAt) {
		const acceptLanguage = headers.get('accept-language') ?? 'en';
		const userLocale = acceptLanguage.split(',')[0]?.split('-')[0] ?? 'en';
		const locale = SUPPORTED_LANGUAGES.includes(userLocale as (typeof SUPPORTED_LANGUAGES)[number])
			? (userLocale as (typeof SUPPORTED_LANGUAGES)[number])
			: 'en';
		// A blocked link needs different copy: /disabled tells the visitor to contact the owner of
		// the QR code, which is terrible advice when the owner is the one who pointed it at phishing.
		const page = shortUrl?.blocked ? 'link-blocked' : 'disabled';
		return NextResponse.rewrite(new URL(`/${locale}/${page}`, req.url));
	}

	// Single consolidated call for all scan analytics
	void fetch(`${serverApiUrl()}/short-url/${urlCode}/record-scan`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...internalHeaders,
		},
		body: JSON.stringify({
			url: req.url,
			userAgent,
			hostname,
			language: language ?? '',
			referrer: headers.get('referer') ?? '',
			ip: scannerIp,
			deviceType,
			browserName: browser.name ?? '',
		}),
	}).catch(() => {});

	return NextResponse.redirect(new URL(shortUrl.destinationUrl));
}
