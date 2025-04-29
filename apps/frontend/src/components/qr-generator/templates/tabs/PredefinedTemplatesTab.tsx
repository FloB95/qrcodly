import { Loader2, StarIcon } from 'lucide-react';
import { usePredefinedTemplatesQuery } from '@/lib/api/config-template';
import type { TConfigTemplate, TCreateConfigTemplateDto } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { TemplatesList } from '../TemplatesList';
import { useTranslations } from 'next-intl';

export const PredefinedTemplatesTab = () => {
	const t = useTranslations('templates');
	const { config, updateConfig } = useQrCodeGeneratorStore((state) => state);
	const { isLoading, data: predefinedTemplates } = usePredefinedTemplatesQuery();

	const handleSelect = (template: TCreateConfigTemplateDto | TConfigTemplate) => {
		updateConfig({
			...config,
			...template.config,
		});
	};

	return (
		<div>
			{isLoading ? (
				<div className="mt-20 flex flex-col items-center justify-center text-center">
					<Loader2 className="mr-2 h-12 w-12 animate-spin" />
				</div>
			) : predefinedTemplates && predefinedTemplates.data.length > 0 ? (
				<TemplatesList templates={predefinedTemplates?.data ?? []} onSelect={handleSelect} />
			) : (
				<div className="mt-20 flex flex-col items-center justify-center text-center">
					<StarIcon className="h-12 w-12" />
					<p className="text-md mt-4 text-center">{t('noPredefinedTemplates')}</p>
				</div>
			)}
		</div>
	);
};
