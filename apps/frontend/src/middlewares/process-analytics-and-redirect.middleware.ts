import { env } from '@/env';
import { apiRequest } from '@/lib/utils';
import type { TShortUrl } from '@shared/schemas';
import { NextResponse, type NextRequest } from 'next/server';

export async function processAnalyticsAndRedirect(req: NextRequest) {
	// Extract data from headers
	const headers = req.headers;
	const rawHostname = headers.get('host') ?? '';
	const cleanedHostname = rawHostname.split(':')[0]; // Remove the port if present
	const hostnameRegex =
		/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
	const hostname =
		cleanedHostname && hostnameRegex.test(cleanedHostname) ? cleanedHostname : 'unknown';

	const payload = {
		type: 'event',
		payload: {
			website: env.NEXT_PUBLIC_UMAMI_WEBSITE,
			url: req.url,
			userAgent: headers.get('user-agent') ?? '',
			hostname,
			language: headers.get('accept-language') ?? '',
			referrer: headers.get('referer') ?? '',
			screen: headers.get('sec-ch-ua-platform') ?? '',
			title: 'test',
			ip: headers.get('x-forwarded-for') ?? '',
			timestamp: Date.now(),
		},
	};

	// Extract short URL code from the request URL
	const urlCode = new URL(req.url).pathname.split('/').pop();
	if (!urlCode) {
		console.error('No URL code found in the request URL');
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

		if (!shortUrl?.destinationUrl || !shortUrl.isActive) {
			return NextResponse.rewrite(new URL('/404', req.url));
		}
	} catch {
		return NextResponse.rewrite(new URL('/404', req.url));
	}

	try {
		const res = await fetch(`${env.UMAMI_API_HOST}/api/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': headers.get('user-agent') ?? '',
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			// Attempt to parse the response as JSON
			const contentType = res.headers.get('content-type');
			if (contentType?.includes('application/json')) {
				const jsonResponse = (await res.json()) as Record<string, unknown>;
				console.error('Response Analytics API:', { error: jsonResponse });
			} else {
				const textResponse = await res.text();
				console.error('Response Analytics API:', { error: textResponse });
			}
		}
	} catch (error) {
		console.log('Error sending request to logger:', error);
	}

	return NextResponse.redirect(new URL(shortUrl.destinationUrl));
}
