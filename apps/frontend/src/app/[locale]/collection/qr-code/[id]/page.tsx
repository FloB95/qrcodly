import { apiRequest } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { DetailPageContent } from '@/components/qr-code-detail/DetailPageContent';
import { Cta } from '@/components/Cta';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';

interface QRCodeDetailProps {
	params: Promise<{
		id: string;
	}>;
}

export const dynamic = 'force-dynamic';

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
				credentials: 'include',
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
		<QrCodeGeneratorStoreProvider
			initState={{
				id: qrCode.id,
				name: qrCode.name ?? undefined,
				config: qrCode.config,
				content: qrCode.content,
				latestQrCode: undefined,
				bulkMode: {
					isBulkMode: false,
					file: undefined,
				},
			}}
		>
			<DetailPageContent qrCode={qrCode} />
			<Cta />
		</QrCodeGeneratorStoreProvider>
	);
}
