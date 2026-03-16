'use client';

import { Button } from '@/components/ui/button';
import { objDiff, type TConfigTemplate } from '@shared/schemas';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useUpdateConfigTemplateMutation } from '@/lib/api/config-template';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';

type UpdateDto = Pick<TConfigTemplate, 'id' | 'name' | 'config'>;
const UpdateTemplateBtn = ({ configTemplate }: { configTemplate: UpdateDto }) => {
	const t = useTranslations('templates');
	const [hasMounted, setHasMounted] = useState(false);
	const updateMutation = useUpdateConfigTemplateMutation();
	const { latestQrCode, updateLatestQrCode } = useQrCodeGeneratorStore((state) => state);

	const hasValidChanges =
		Object.keys(objDiff(configTemplate.config, latestQrCode?.config)).length > 0 ||
		(configTemplate.name || null) !== (latestQrCode?.name || null);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const handleUpdate = async () => {
		try {
			await updateMutation.mutateAsync({
				configTemplateId: configTemplate.id,
				data: {
					config: configTemplate.config,
					name: configTemplate.name,
				},
			});

			updateLatestQrCode({
				name: configTemplate.name,
				config: configTemplate.config,
				content: latestQrCode!.content,
			});
		} catch {
			// Mutation error is handled by TanStack Query
		}
	};

	return (
		<>
			<Button
				className="cursor-pointer"
				isLoading={updateMutation.isPending}
				onClick={() => handleUpdate()}
				disabled={!hasMounted || !hasValidChanges || updateMutation.isPending}
			>
				{t('updateBtn')}
			</Button>
		</>
	);
};

export default UpdateTemplateBtn;
