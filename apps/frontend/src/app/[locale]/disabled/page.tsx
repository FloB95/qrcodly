import { QrCodeDisabledContent } from '@/components/QrCodeDisabledContent';
import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';

// reached only by rewrite from a scan; there is nothing here worth indexing
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default async function QrCodeDisabledPage({ params }: DefaultPageParams) {
	const { locale } = await params;
	return <QrCodeDisabledContent locale={locale} />;
}
