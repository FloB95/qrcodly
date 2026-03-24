'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

export default function SignupSuccessPage() {
	const router = useRouter();

	useEffect(() => {
		if (typeof window.gtag === 'function') {
			window.gtag('event', 'conversion', {
				send_to: 'AW-10838865201/nuV5CNm-pY0cELHqr7Ao',
				value: 1.0,
				currency: 'EUR',
			});
		}

		router.replace('/dashboard/qr-codes');
	}, [router]);

	return null;
}
