import { env } from '@/env';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { apiRequest } from '@/lib/utils';
import type { TShortUrl } from '@shared/schemas';
import { NextResponse, type NextRequest } from 'next/server';
import { UAParser } from 'ua-parser-js';

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

	const payload = {
		type: 'event',
		payload: {
			website: env.NEXT_PUBLIC_UMAMI_WEBSITE,
			url: req.url,
			userAgent,
			hostname,
			language: language ?? '',
			referrer: headers.get('referer') ?? '',
			screen: headers.get('sec-ch-ua-platform') ?? '',
			device: device.type,
			browser: browser.name,
			ip: headers.get('x-forwarded-for') ?? '',
		},
	};

	const urlCode = new URL(req.url).pathname.split('/').pop();
	if (!urlCode) {
		return NextResponse.rewrite(new URL('/404', req.url));
	}

	let shortUrl: TShortUrl;
	try {
		const response = await apiRequest<TShortUrl>(`/short-url/${urlCode}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		shortUrl = response;

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

	try {
		await fetch(`${env.UMAMI_API_HOST}/api/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': headers.get('user-agent') ?? '',
			},
			body: JSON.stringify(payload),
		});
	} catch {}

	void fetch(`${env.NEXT_PUBLIC_API_URL}/short-url/${urlCode}/clear-views-cache`, {
		method: 'POST',
		headers: { 'x-internal-api-key': env.INTERNAL_API_SECRET },
	}).catch(() => {});

	// Dispatch scan data to user-configured analytics integrations (GA4, Matomo)
	void fetch(`${env.NEXT_PUBLIC_API_URL}/short-url/${urlCode}/track-scan`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-internal-api-key': env.INTERNAL_API_SECRET,
		},
		body: JSON.stringify({
			url: req.url,
			userAgent,
			hostname,
			language: language ?? '',
			referrer: headers.get('referer') ?? '',
			ip: headers.get('x-forwarded-for') ?? '',
			deviceType: device.type ?? '',
			browserName: browser.name ?? '',
		}),
	}).catch(() => {});

	return NextResponse.redirect(new URL(shortUrl.destinationUrl));
}
