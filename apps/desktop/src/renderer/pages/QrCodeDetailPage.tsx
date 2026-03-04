import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { DetailPageContent } from '@/components/qr-code-detail/DetailPageContent';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { Loader } from '@/components/ui/loader';

export default function QrCodeDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { getToken } = useAuth();

	const { data: qrCode, isLoading } = useQuery({
		queryKey: ['qrCode', id],
		queryFn: async () => {
			const token = await getToken();
			return apiRequest<TQrCodeWithRelationsResponseDto>(`/qr-code/${id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
					credentials: 'include',
				},
			});
		},
		enabled: !!id,
	});

	if (isLoading) {
		return <Loader />;
	}

	if (!qrCode) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground">QR code not found</p>
			</div>
		);
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
		</QrCodeGeneratorStoreProvider>
	);
}
