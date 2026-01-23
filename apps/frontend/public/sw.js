// Service Worker for QRcodly PWA
const CACHE_NAME = 'qrcodly-cache-v1';
const STATIC_CACHE_NAME = 'qrcodly-static-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
	'/',
	'/favicon-32x32.png',
	'/favicon-16x16.png',
	'/apple-touch-icon.png',
	'/android-chrome-192x192.png',
	'/android-chrome-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(STATIC_CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS);
		}),
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
					.map((name) => caches.delete(name)),
			);
		}),
	);
	self.clients.claim();
});

// Fetch event - stale-while-revalidate strategy for most requests
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== 'GET') return;

	// Skip API calls, auth endpoints, and analytics
	if (
		url.pathname.startsWith('/api/') ||
		url.pathname.startsWith('/monitoring') ||
		url.hostname.includes('clerk') ||
		url.hostname.includes('posthog') ||
		url.hostname.includes('sentry')
	) {
		return;
	}

	// Cache-first for static assets (fonts, images, JS, CSS)
	if (
		url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico|webp|avif)$/) ||
		url.pathname.includes('/_next/static/')
	) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) {
					// Return cached version and update cache in background
					event.waitUntil(
						fetch(request)
							.then((response) => {
								if (response.ok) {
									const clone = response.clone();
									caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
								}
							})
							.catch(() => {}),
					);
					return cached;
				}
				return fetch(request).then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				});
			}),
		);
		return;
	}

	// Network-first for HTML pages with fallback to cache
	if (request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(() => caches.match(request)),
		);
		return;
	}
});
