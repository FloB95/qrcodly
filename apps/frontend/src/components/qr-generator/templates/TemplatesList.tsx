/* eslint-disable @next/next/no-img-element */

import type { TConfigTemplateResponseDto } from '@shared/schemas';
import { DynamicQrCode } from '../DynamicQrCode';


type TemplateListProps = {
	templates: TConfigTemplateResponseDto[];
	onSelect: (data: TConfigTemplateResponseDto) => void;
};

export const TemplatesList = ({ templates, onSelect }: TemplateListProps) => {
	const handleSelect = (template: TConfigTemplateResponseDto) => {
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
								<div className="h-[90px] w-[90px] overflow-hidden">
									{template.previewImage ? (
										<img src={template.previewImage} alt="QR code preview" loading="lazy" />
									) : (
										<DynamicQrCode
											qrCode={{
												config: template.config,
												content: 'https://www.qrcodly.de/',
												contentType: 'url',
											}}
										/>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};
