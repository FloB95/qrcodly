import { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, StarIcon } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useListConfigTemplatesQuery } from '@/lib/api/config-template';
import type { TConfigTemplate, TCreateConfigTemplateDto } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { TemplatesList } from '../TemplatesList';
import { useTranslations } from 'next-intl';

export const MyTemplatesTab = () => {
	const t = useTranslations('templates');
	const { config, updateConfig } = useQrCodeGeneratorStore((state) => state);
	const [searchName, setSearchName] = useState<string>('');
	const [debouncedSearchName] = useDebouncedValue(searchName, 300);

	const { isLoading, data: configTemplates } = useListConfigTemplatesQuery(debouncedSearchName);

	// Stable callback for template selection
	const handleSelect = useCallback(
		(template: TCreateConfigTemplateDto | TConfigTemplate) => {
			updateConfig({
				...config,
				...template.config,
			});
		},
		[config, updateConfig],
	);

	// Stable callback for search input
	const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchName(e.target.value);
	}, []);

	// Memoize template data
	const templates = useMemo(() => configTemplates?.data ?? [], [configTemplates?.data]);

	// Determine what to show
	const hasTemplates = templates.length > 0;
	const isSearching = searchName.trim() !== '';
	const isInitialLoad = !isSearching && !hasTemplates;

	return (
		<div>
			{/* Search input - always visible */}
			<Input
				value={searchName}
				className="mb-5"
				placeholder={t('search.placeholder')}
				onChange={handleSearchChange}
			/>

			{/* Loading state */}
			{isLoading && (
				<div className="mt-20 flex flex-col items-center justify-center text-center">
					<Loader2 className="mr-2 h-12 w-12 animate-spin" />
				</div>
			)}

			{/* No templates exist (initial state) */}
			{!isLoading && isInitialLoad && (
				<div className="mt-20 flex flex-col items-center justify-center text-center">
					<StarIcon className="h-12 w-12" />
					<p className="text-md mt-4 text-center">{t('noTemplates')}</p>
				</div>
			)}

			{/* Search returned no results */}
			{!isLoading && isSearching && !hasTemplates && (
				<div className="mt-20 flex flex-col items-center justify-center text-center">
					<StarIcon className="h-12 w-12" />
					<p className="text-md mt-4 text-center">{t('search.noResults', { searchName })}</p>
				</div>
			)}

			{/* Show templates */}
			{!isLoading && hasTemplates && (
				<TemplatesList templates={templates} onSelect={handleSelect} deletable={true} />
			)}
		</div>
	);
};
