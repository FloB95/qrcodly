'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplatesList } from './TemplatesList';
import { useAuth } from '@clerk/nextjs';
import { PREDEFINED_TEMPLATES } from './PredefinedTemplatesData';
import type { TConfigTemplate, TCreateConfigTemplateDto, TQrCodeOptions } from '@shared/schemas';

type TemplateTabsProps = {
	settings: TQrCodeOptions;
	onSelect: (data: TQrCodeOptions) => void;
};

export const TemplateTabs = ({ settings, onSelect }: TemplateTabsProps) => {
	const { isSignedIn } = useAuth();

	const handleSelect = (template: TCreateConfigTemplateDto | TConfigTemplate) => {
		onSelect({
			...settings,
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
						{/* <div>
              {isLoading && <p>Loading...</p>}
              {configTemplates && (
                <TemplatesList
                  templates={configTemplates}
                  onSelect={handleSelect}
                  settings={settings}
                />
              )}
            </div> */}
					</TabsContent>
				)}
				<TabsContent value="predefinedTemplates" className="mt-0">
					<TemplatesList
						templates={PREDEFINED_TEMPLATES}
						onSelect={handleSelect}
						settings={settings}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
};
