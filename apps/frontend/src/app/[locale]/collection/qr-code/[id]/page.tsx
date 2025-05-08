import { apiRequest } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { DetailPageContent } from '@/components/qr-code-detail/DetailPageContent';
import { Cta } from '@/components/Cta';

interface QRCodeDetailProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function QRCodeDetailPage({ params }: QRCodeDetailProps) {
	const { id } = await params;

	// Fetch QR code details
	let qrCode: TQrCodeWithRelationsResponseDto | null = null;
	try {
		const { getToken } = await auth();
		const token = await getToken();

		qrCode = await apiRequest<TQrCodeWithRelationsResponseDto>(`/qr-code/${id}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
	} catch (error) {
		console.error('Failed to fetch QR code details:', error);
	}

	// Handle not found
	if (!qrCode) {
		notFound();
	}

	return (
		<>
			<DetailPageContent qrCode={qrCode} />
			<Cta />
		</>
	);
}
