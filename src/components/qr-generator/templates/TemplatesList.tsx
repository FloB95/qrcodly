import { TConfigTemplate } from "~/server/domain/types/ConfigTemplate";
import { DynamicQrCode } from "../DynamicQrCode";
import { TPredefinedTemplate } from "./PredefinedTemplatesData";
import { TQRcodeOptions } from "~/server/domain/types/QRcode";

type TemplateListProps = {
  settings: TQRcodeOptions;
  templates: TPredefinedTemplate[] | TConfigTemplate[];
  onSelect: (data: TPredefinedTemplate | TConfigTemplate) => void;
};

export const TemplatesList = ({
  settings,
  templates,
  onSelect,
}: TemplateListProps) => {
  const handleSelect = (template: any) => {
    onSelect(template.config);
  };

  return (
    <div className="grid cursor-pointer grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {templates.map((template) => {
        const s: any = { settings, ...template.config };
        return (
          <div
            key={template.id}
            className="flex"
            onClick={() => handleSelect(template)}
          >
            <div>
              <p className="text mb-1 text-sm font-semibold">{template.name}</p>
              <div className="h-24 w-24">
                <DynamicQrCode settings={s} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
