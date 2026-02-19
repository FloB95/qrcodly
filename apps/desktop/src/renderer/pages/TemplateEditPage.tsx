import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { ALL_QR_CODE_CONTENT_TYPES, type TConfigTemplate } from '@shared/schemas';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { useTranslations } from 'next-intl';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { env } from '@/env';
import { Loader } from '@/components/ui/loader';

export default function TemplateEditPage() {
	const { id } = useParams<{ id: string }>();
	const { getToken } = useAuth();
	const t = useTranslations();

	const { data: template, isLoading } = useQuery({
		queryKey: ['configTemplate', id],
		queryFn: async () => {
			const token = await getToken();
			return apiRequest<TConfigTemplate>(`/config-template/${id}`, {
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

	if (!template) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground">Template not found</p>
			</div>
		);
	}

	const backLink = (
		<Link
			className="hidden lg:flex items-center space-x-2 px-2 -top-12 absolute"
			href="/dashboard/templates"
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
				hiddenContentTypes={[...ALL_QR_CODE_CONTENT_TYPES]}
				backLink={backLink}
			/>
		</QrCodeGeneratorStoreProvider>
	);
}
