'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplatesList } from './TemplatesList';
import { useAuth } from '@clerk/nextjs';
import { PREDEFINED_TEMPLATES } from './PredefinedTemplatesData';
import type { TConfigTemplate, TCreateConfigTemplateDto } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useMyConfigTemplatesQuery } from '@/lib/api/config-template';
import { Loader2, StarIcon } from 'lucide-react';

export const TemplateTabs = () => {
	const { isSignedIn } = useAuth();
	const { config, updateConfig } = useQrCodeGeneratorStore((state) => state);

	const myConfigTemplatesQuery = useMyConfigTemplatesQuery();
	const { isLoading, data: configTemplates } = isSignedIn
		? myConfigTemplatesQuery
		: { isLoading: false, data: null };

	const handleSelect = (template: TCreateConfigTemplateDto | TConfigTemplate) => {
		updateConfig({
			...config,
			...template.config,
		});
	};

	return (
		<div className="xl:w-2/3">
			<Tabs defaultValue={isSignedIn ? 'myTemplates' : 'predefinedTemplates'} className="w-full">
				<TabsList className="mb-4 w-full">
					{isSignedIn && (
						<TabsTrigger className="flex-1" value="myTemplates">
							My Templates
						</TabsTrigger>
					)}
					<TabsTrigger className="flex-1" value="predefinedTemplates">
						Predefined
					</TabsTrigger>
				</TabsList>
				{isSignedIn && (
					<TabsContent value="myTemplates" className="mt-0">
						<div>
							{isLoading ? (
								<div className="mt-20 justify-center text-center flex flex-col items-center">
									<Loader2 className="mr-2 h-12 w-12 animate-spin" />
								</div>
							) : configTemplates && configTemplates.data.length > 0 ? (
								<TemplatesList templates={configTemplates?.data ?? []} onSelect={handleSelect} />
							) : (
								<div className="mt-20 justify-center text-center flex flex-col items-center">
									<StarIcon className="h-12 w-12" />
									<p className="text-center text-md mt-4">You don&apos;t have any templates yet.</p>
								</div>
							)}
						</div>
					</TabsContent>
				)}
				<TabsContent value="predefinedTemplates" className="mt-0">
					<TemplatesList templates={PREDEFINED_TEMPLATES} onSelect={handleSelect} />
				</TabsContent>
			</Tabs>
		</div>
	);
};
