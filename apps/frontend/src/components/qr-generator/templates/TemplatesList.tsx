import type { TConfigTemplate, TCreateConfigTemplateDto, TQrCodeOptions } from 'qrcodly-api-types';
import { DynamicQrCode } from '../DynamicQrCode';

type TemplateListProps = {
	settings: TQrCodeOptions;
	templates: TCreateConfigTemplateDto[] | TConfigTemplate[];
	onSelect: (data: TCreateConfigTemplateDto | TConfigTemplate) => void;
};

export const TemplatesList = ({ templates, onSelect }: TemplateListProps) => {
	const handleSelect = (template: TCreateConfigTemplateDto | TConfigTemplate) => {
		onSelect(template);
	};

	return (
		<div className="grid cursor-pointer grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
			{templates.map((template, index) => {
				return (
					<div key={index} className="flex" onClick={() => handleSelect(template)}>
						<div>
							<p className="text mb-1 text-sm font-semibold">{template.name}</p>
							<div className="h-24 w-24">
								<DynamicQrCode
									qrCode={{
										config: template.config,
										content: 'https://www.qrcodly.de/',
										contentType: 'url',
									}}
								/>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};
