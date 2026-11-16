'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

export default function SignupSuccessPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace('/dashboard/qr-codes');
	}, [router]);

	return null;
}
