/**
 * QRcodly Custom Domain Worker
 *
 * This Cloudflare Worker handles requests for custom domains and routes them
 * to the main QRcodly application.
 *
 * Flow:
 * 1. Extract hostname from the incoming request
 * 2. Call the backend API to validate the domain is registered and active
 * 3. If valid:
 *    - For /u/{code} paths (short URLs), redirect to TARGET_DOMAIN/u/{code}
 *    - For all other paths, redirect to TARGET_DOMAIN
 * 4. If not valid, return 404
 */

export interface Env {
	/** Backend API URL (e.g., https://api.qrcodly.de) */
	BACKEND_API_URL: string;
	/** Target domain to redirect to (e.g., www.qrcodly.de) */
	TARGET_DOMAIN: string;
}

interface DomainValidationResponse {
	domain: string;
	isValid: boolean;
	sslStatus: string;
}

/** Cache for domain validation results (in-memory, per-isolate) */
const domainCache = new Map<string, { result: DomainValidationResponse; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Validates a domain against the backend API.
 * Results are cached in memory for 1 minute to reduce API calls.
 */
async function validateDomain(
	domain: string,
	backendApiUrl: string,
): Promise<DomainValidationResponse> {
	// Check cache first
	const cached = domainCache.get(domain);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		return cached.result;
	}

	try {
		const response = await fetch(
			`${backendApiUrl}/api/v1/custom-domain/resolve?domain=${encodeURIComponent(domain)}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);

		if (!response.ok) {
			// Domain not found or API error
			const result: DomainValidationResponse = {
				domain,
				isValid: false,
				sslStatus: 'api_error',
			};
			domainCache.set(domain, { result, timestamp: Date.now() });
			return result;
		}

		const data = (await response.json()) as { data: DomainValidationResponse };
		const result = data.data;

		// Cache the result
		domainCache.set(domain, { result, timestamp: Date.now() });

		return result;
	} catch (error) {
		// Network error or other failure
		console.error('Domain validation error:', error);
		return {
			domain,
			isValid: false,
			sslStatus: 'network_error',
		};
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const hostname = url.hostname;
		const pathname = url.pathname;

		// Validate the custom domain
		const validation = await validateDomain(hostname, env.BACKEND_API_URL);

		if (!validation.isValid) {
			// Domain is not valid - return 404 with helpful message
			return new Response(
				JSON.stringify({
					error: 'Domain not recognized',
					domain: hostname,
					message:
						'This domain is not configured or not yet active. Please check your domain settings.',
				}),
				{
					status: 404,
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);
		}

		// Domain is valid - determine redirect target
		const targetDomain = env.TARGET_DOMAIN;

		// Check if this is a short URL path (/u/{code})
		if (pathname.startsWith('/u/')) {
			// Redirect to the main domain with the same path
			// e.g., links.customer.com/u/abc123 -> www.qrcodly.de/u/abc123
			const targetUrl = `https://${targetDomain}${pathname}${url.search}`;
			return Response.redirect(targetUrl, 301);
		}

		// For all other paths, redirect to the main domain root
		// e.g., links.customer.com/anything -> www.qrcodly.de
		const targetUrl = `https://${targetDomain}`;
		return Response.redirect(targetUrl, 301);
	},
};
