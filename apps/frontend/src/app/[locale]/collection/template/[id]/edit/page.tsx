import { apiRequest } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import type { TConfigTemplate } from '@shared/schemas';
import type { SupportedLanguages } from '@/i18n/routing';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { getTranslations } from 'next-intl/server';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { env } from '@/env';

interface ConfigTemplateEditProps {
	params: Promise<{
		id: string;
		locale: SupportedLanguages;
	}>;
}

export const dynamic = 'force-dynamic';

export default async function ConfigTemplateEditPage({ params }: ConfigTemplateEditProps) {
	const { id, locale } = await params;
	const t = await getTranslations({ locale });

	// Fetch QR code details
	let template: TConfigTemplate | null = null;
	try {
		const { getToken } = await auth();
		const token = await getToken();

		template = await apiRequest<TConfigTemplate>(`/config-template/${id}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
				credentials: 'include',
			},
		});
	} catch (error) {
		console.error('Failed to fetch Template details:', error);
	}

	if (!template) {
		notFound();
	}

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
				id: template.id,
				name: template.name ?? undefined,
				config: template.config,
				content: {
					type: 'url',
					data: {
						url: env.NEXT_PUBLIC_FRONTEND_URL,
						isEditable: true,
					},
				},
				bulkMode: {
					isBulkMode: false,
					file: undefined,
				},
			}}
		>
			<h1 className="mt-12 lg:mt-12 mb-16 text-center text-2xl sm:text-4xl font-semibold">
				{t('templates.update.headline')}
			</h1>
			<QRcodeGenerator
				generatorType="QrCodeWithTemplateUpdateBtn"
				isEditMode
				hiddenTabs={['templates']}
				hiddenContentTypes={['url', 'text', 'wifi', 'vCard', 'email', 'event', 'location']}
				backLink={backLink}
			/>
		</QrCodeGeneratorStoreProvider>
	);
}
