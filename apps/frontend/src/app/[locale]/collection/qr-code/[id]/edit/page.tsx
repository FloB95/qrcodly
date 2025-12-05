import { apiRequest } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import type { SupportedLanguages } from '@/i18n/routing';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { getTranslations } from 'next-intl/server';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface QRCodeDetailProps {
	params: Promise<{
		id: string;
		locale: SupportedLanguages;
	}>;
}

export const dynamic = 'force-dynamic';

export default async function QRCodeDetailPage({ params }: QRCodeDetailProps) {
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

	const tabs = ['url', 'text', 'wifi', 'vCard'];
	const hiddenProps = tabs.reduce((acc: Record<string, boolean>, t) => {
		const propName = 'hideContent' + t.charAt(0).toUpperCase() + t.slice(1) + 'Tab';
		acc[propName] = t !== qrCode.content.type;

		return acc;
	}, {});

	const backLink = (
		<Link
			className="hidden lg:flex items-center space-x-2 px-2 -top-12 absolute"
			href={`/${locale}/collection`}
		>
			<ChevronLeftIcon className="w-5 h-5" /> <span>{t('general.backToOverview')}</span>
		</Link>
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
			}}
		>
			<h1 className="mt-12 lg:mt-12 mb-16 text-center text-4xl font-bold">
				{t('qrCode.update.headline')}
			</h1>
			<QRcodeGenerator isEditMode {...hiddenProps} backLink={backLink} />
		</QrCodeGeneratorStoreProvider>
	);
}
