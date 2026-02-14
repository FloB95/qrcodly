import { apiRequest } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ALL_QR_CODE_CONTENT_TYPES, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import type { SupportedLanguages } from '@/i18n/routing';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { getTranslations } from 'next-intl/server';
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

interface QRCodeEditProps {
	params: Promise<{
		id: string;
		locale: SupportedLanguages;
	}>;
}

export const dynamic = 'force-dynamic';

export default async function QRCodeEditPage({ params }: QRCodeEditProps) {
	const { id, locale } = await params;
	const t = await getTranslations({ locale });

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

	if (!qrCode) {
		notFound();
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
									<Link href={`/${locale}/dashboard/qr-codes`}>{t('collection.tabQrCode')}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href={`/${locale}/dashboard/qr-codes/${id}`}>
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
