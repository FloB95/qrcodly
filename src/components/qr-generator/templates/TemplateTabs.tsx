"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  PREDEFINED_TEMPLATES,
  TPredefinedTemplate,
} from "./PredefinedTemplatesData";
import { TemplatesList } from "./TemplatesList";
import { TQRcodeOptions } from "~/server/domain/types/QRcode";
import { useAuth } from "@clerk/nextjs";
import { api } from "~/lib/trpc/react";
import { TConfigTemplate } from "~/server/domain/types/ConfigTemplate";

type TemplateTabsProps = {
  settings: TQRcodeOptions;
  onSelect: (data: TQRcodeOptions) => void;
};

export const TemplateTabs = ({ settings, onSelect }: TemplateTabsProps) => {
  const { isSignedIn } = useAuth();

  const { isLoading, data: configTemplates } = isSignedIn
    ? api.qrCodeTemplate.getMyConfigTemplates.useQuery()
    : { isLoading: false, data: null };

  console.log("configTemplates", configTemplates);

  const handleSelect = (template: TPredefinedTemplate | TConfigTemplate) => {
    // convert TPredefinedTemplate or TConfigTemplate to TQRcodeOptions
    onSelect({
      ...settings,
      ...template.config,
    });
  };

  return (
    <div className="xl:w-2/3">
      <Tabs
        defaultValue={isSignedIn ? "myTemplates" : "predefinedTemplates"}
        className="w-full"
      >
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
              {isLoading && <p>Loading...</p>}
              {configTemplates && (
                <TemplatesList
                  templates={configTemplates}
                  onSelect={handleSelect}
                  settings={settings}
                />
              )}
            </div>
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
