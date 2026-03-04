import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicSharedQrCode } from '@/lib/api/qr-code-share';
import { PublicSharePageContent } from '@/components/qr-code-share/PublicSharePageContent';
import Container from '@/components/ui/container';
import { env } from '@/env';

interface PublicSharePageProps {
	params: Promise<{
		locale: string;
		token: string;
	}>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PublicSharePageProps): Promise<Metadata> {
	const { token } = await params;

	try {
		const sharedQrCode = await getPublicSharedQrCode(token, env.NEXT_PUBLIC_API_URL);
		const titleText = sharedQrCode.name
			? `Shared QR Code ${sharedQrCode.name} | QRcodly`
			: 'Shared QR Code | QRcodly';

		return {
			title: { absolute: titleText },
			robots: 'noindex, nofollow',
		};
	} catch {
		return {
			title: { absolute: 'Shared QR Code | QRcodly' },
			robots: 'noindex, nofollow',
		};
	}
}

export default async function PublicSharePage({ params }: PublicSharePageProps) {
	const { token } = await params;

	let sharedQrCode;
	try {
		sharedQrCode = await getPublicSharedQrCode(token, env.NEXT_PUBLIC_API_URL);
	} catch {
		notFound();
	}

	return (
		<Container className="flex min-h-screen items-center justify-center py-8 sm:py-12">
			<PublicSharePageContent sharedQrCode={sharedQrCode} />
		</Container>
	);
}
