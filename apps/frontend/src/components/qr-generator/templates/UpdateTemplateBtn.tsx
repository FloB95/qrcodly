'use client';

import { Button } from '@/components/ui/button';
import { type TConfigTemplate } from '@shared/schemas';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useUpdateConfigTemplateMutation } from '@/lib/api/config-template';

type UpdateDto = Pick<TConfigTemplate, 'id' | 'name' | 'config'>;
const UpdateTemplateBtn = ({ configTemplate }: { configTemplate: UpdateDto }) => {
	const t = useTranslations('templates');
	const [hasMounted, setHasMounted] = useState(false);
	const updateMutation = useUpdateConfigTemplateMutation();

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
		} catch (error) {}
	};

	return (
		<>
			<Button
				className="cursor-pointer"
				isLoading={updateMutation.isPending}
				onClick={() => handleUpdate()}
				disabled={!hasMounted || updateMutation.isPending}
			>
				{t('updateBtn')}
			</Button>
		</>
	);
};

export default UpdateTemplateBtn;
