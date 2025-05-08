'use client';

import dynamic from 'next/dynamic';
import { QrCodeSkeleton } from './QrCodeSkeleton';

export const DynamicQrCode = dynamic(() => import('./QrCode'), {
	ssr: false,
	loading: () => <QrCodeSkeleton />,
});
