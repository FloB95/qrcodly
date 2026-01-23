'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
	useEffect(() => {
		if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
			navigator.serviceWorker
				.register('/sw.js')
				.then((registration) => {
					console.log('SW registered:', registration.scope);
				})
				.catch((error) => {
					console.error('SW registration failed:', error);
				});
		}
	}, []);

	return null;
}
