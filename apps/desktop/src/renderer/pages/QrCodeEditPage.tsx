import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { ALL_QR_CODE_CONTENT_TYPES, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { useTranslations } from 'next-intl';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { EditPageTagSection } from '@/components/qr-code-detail/EditPageTagSection';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Loader } from '@/components/ui/loader';

export default function QrCodeEditPage() {
	const { id } = useParams<{ id: string }>();
	const { getToken } = useAuth();
	const t = useTranslations();

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

	const hiddenContentTypes = ALL_QR_CODE_CONTENT_TYPES.filter(
		(type) => type !== qrCode.content.type,
	);

	return (
		<QrCodeGeneratorStoreProvider
			initState={{
				id: qrCode.id,
				name: qrCode.name ?? undefined,
				config: qrCode.config,
				content: qrCode.content,
				shortUrl: qrCode.shortUrl ?? undefined,
				latestQrCode: {
					name: qrCode.name ?? undefined,
					config: qrCode.config,
					content:
						qrCode.content.type === 'url' && qrCode.shortUrl?.destinationUrl
							? {
									...qrCode.content,
									data: {
										...qrCode.content.data,
										url: qrCode.shortUrl.destinationUrl,
									},
								}
							: qrCode.content,
				},
				bulkMode: {
					isBulkMode: false,
					file: undefined,
				},
			}}
		>
			{/* Header Card */}
			<Card className="@container/card">
				<CardContent className="px-4 sm:px-6">
					<Breadcrumb className="mb-4">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/dashboard/qr-codes">{t('collection.tabQrCode')}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href={`/dashboard/qr-codes/${id}`}>
										{qrCode.name || t('general.noName')}
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{t('general.edit')}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					<div className="flex items-center gap-3">
						<div className="p-3 bg-primary/10 rounded-lg">
							<PencilSquareIcon className="size-6 sm:size-8 stroke-1" />
						</div>
						<div>
							<h1 className="text-lg font-semibold">{t('qrCode.update.headline')}</h1>
							<EditPageTagSection qrCodeId={qrCode.id} tags={qrCode.tags ?? []} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Generator */}
			<QRcodeGenerator
				generatorType="QrCodeWithUpdateBtn"
				isEditMode
				compact
				hiddenContentTypes={hiddenContentTypes}
			/>
		</QrCodeGeneratorStoreProvider>
	);
}
