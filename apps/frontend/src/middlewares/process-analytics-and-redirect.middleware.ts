import { env } from '@/env';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { NextResponse, type NextRequest } from 'next/server';
import { UAParser } from 'ua-parser-js';

type ScanLookupResponse = {
	destinationUrl: string | null;
	isActive: boolean;
	deletedAt: string | null;
};

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

	const language = headers.get('accept-language')
		? headers.get('accept-language')?.split(',')[0]
		: '';

	const scannerIp = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

	const urlCode = new URL(req.url).pathname.split('/').pop();
	if (!urlCode) {
		return NextResponse.rewrite(new URL('/404', req.url));
	}

	const internalHeaders = {
		'x-internal-api-key': env.INTERNAL_API_SECRET,
		'x-scanner-ip': scannerIp,
	};

	let shortUrl: ScanLookupResponse;
	try {
		const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/short-url/${urlCode}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				...internalHeaders,
			},
		});

		if (!response.ok) {
			return NextResponse.rewrite(new URL('/404', req.url));
		}

		shortUrl = (await response.json()) as ScanLookupResponse;

		if (!shortUrl?.destinationUrl || !shortUrl.isActive || shortUrl.deletedAt) {
			const acceptLanguage = headers.get('accept-language') ?? 'en';
			const userLocale = acceptLanguage.split(',')[0]?.split('-')[0] ?? 'en';
			const locale = SUPPORTED_LANGUAGES.includes(
				userLocale as (typeof SUPPORTED_LANGUAGES)[number],
			)
				? (userLocale as (typeof SUPPORTED_LANGUAGES)[number])
				: 'en';
			return NextResponse.rewrite(new URL(`/${locale}/disabled`, req.url));
		}
	} catch {
		return NextResponse.rewrite(new URL('/404', req.url));
	}

	// Single consolidated call for all scan analytics
	void fetch(`${env.NEXT_PUBLIC_API_URL}/short-url/${urlCode}/record-scan`, {
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
			deviceType: device.type ?? '',
			browserName: browser.name ?? '',
			screen: headers.get('sec-ch-ua-platform') ?? '',
		}),
	}).catch(() => {});

	return NextResponse.redirect(new URL(shortUrl.destinationUrl));
}
