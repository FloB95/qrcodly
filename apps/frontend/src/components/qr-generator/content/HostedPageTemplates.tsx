'use client';

import { useTranslations } from 'next-intl';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import { getTemplatesForType, type THostedPageType } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import type { HostedTemplateChoice } from '@/components/hosted-page/preview';

export type { HostedTemplateChoice };

type HostedPageTemplatesProps = {
	/** Only templates made for this page type are offered */
	type: THostedPageType;
	/** The card to highlight: an adopted template, the blank sheet, or none */
	activeId: HostedTemplateChoice | null;
	onSelect: (id: HostedTemplateChoice) => void;
	disabled?: boolean;
	/** The blank sheet starts a page from nothing, which only makes sense for a new page */
	showBlank?: boolean;
};

/** Ready-made designs per use case, the hosted-page counterpart of the QR code templates. */
export function HostedPageTemplates({
	type,
	activeId,
	onSelect,
	disabled,
	showBlank = true,
}: HostedPageTemplatesProps) {
	const t = useTranslations('generator.contentSwitch.hosted.templates');

	return (
		<div className="space-y-2">
			<Label>{t('label')}</Label>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
				{showBlank && (
					<button
						type="button"
						aria-pressed={activeId === 'blank'}
						disabled={disabled}
						onClick={() => onSelect('blank')}
						className={cn(
							'cursor-pointer rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
							activeId === 'blank'
								? 'border-slate-900 bg-white shadow-sm'
								: 'border-dashed border-border bg-white/60 hover:bg-white',
						)}
					>
						<span className="mb-2 flex h-12 items-center justify-center rounded-lg border border-dashed border-border bg-white text-muted-foreground">
							<DocumentPlusIcon className="size-5" aria-hidden="true" />
						</span>
						<span className="block text-sm font-medium">{t('blank.name')}</span>
						<span className="block text-xs text-muted-foreground">{t('blank.description')}</span>
					</button>
				)}
				{getTemplatesForType(type).map((template) => {
					const active = template.id === activeId;
					const dark = template.theme.mode === 'dark';
					return (
						<button
							key={template.id}
							type="button"
							aria-pressed={active}
							disabled={disabled}
							onClick={() => onSelect(template.id)}
							className={cn(
								'cursor-pointer rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
								active
									? 'border-slate-900 bg-white shadow-sm'
									: 'border-border bg-white/60 hover:bg-white',
							)}
						>
							<span
								className="mb-2 block h-12 rounded-lg p-2"
								style={{
									backgroundColor: dark
										? template.theme.primaryColor
										: `color-mix(in srgb, ${template.theme.primaryColor} 10%, white)`,
								}}
							>
								<span
									className="block h-2 w-10 rounded-full"
									style={{ backgroundColor: template.theme.accentColor }}
								/>
								<span
									className="mt-1.5 block h-2 w-16 rounded-full"
									style={{
										backgroundColor: dark ? '#ffffff' : template.theme.primaryColor,
										opacity: 0.85,
									}}
								/>
								<span
									className="mt-1.5 block h-3.5 w-20 rounded-full"
									style={{ backgroundColor: template.theme.primaryColor, opacity: dark ? 0.5 : 1 }}
								/>
							</span>
							<span className="block text-sm font-medium">{t(`${template.id}.name`)}</span>
							<span className="block text-xs text-muted-foreground">
								{t(`${template.id}.description`)}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
