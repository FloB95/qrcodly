'use client';

import React, { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { PaintBrushIcon, QrCodeIcon, StarIcon } from '@heroicons/react/24/outline';

import { ContentSwitch } from './content/ContentSwitch';
import { SettingsForm } from './style/SettingsForm';
import { TemplateTabs } from './templates/TemplateTabs';
import { Input } from '../ui/input';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import { QrCodeWithDownloadBtn } from './QrCodeWithDownloadBtn';
import { QrCodeWithUpdateBtn } from './QrCodeWithUpdateBtn';
import { QrCodeWithTemplateUpdateBtn } from './templates/QrCodeWithTemplateUpdateBtn';
import type { TQrCodeContentType } from '@shared/schemas';

type GeneratorTab = 'content' | 'style' | 'templates';
type GeneratorTabConfig = {
	type: GeneratorTab;
	labelKey: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const GENERATOR_TABS: GeneratorTabConfig[] = [
	{
		type: 'content',
		labelKey: 'tabs.content',
		icon: QrCodeIcon,
	},
	{
		type: 'style',
		labelKey: 'tabs.style',
		icon: PaintBrushIcon,
	},
	{
		type: 'templates',
		labelKey: 'tabs.templates',
		icon: StarIcon,
	},
];

type QrCodeGeneratorType =
	| 'QrCodeWithDownloadBtn'
	| 'QrCodeWithUpdateBtn'
	| 'QrCodeWithTemplateUpdateBtn';

type QRcodeGeneratorProps = {
	hiddenTabs?: GeneratorTab[];
	hiddenContentTypes?: TQrCodeContentType[];
	isEditMode?: boolean;
	backLink?: React.ReactNode;
	generatorType: QrCodeGeneratorType;
};

const QR_OUTPUT_MAP = {
	QrCodeWithDownloadBtn: QrCodeWithDownloadBtn,
	QrCodeWithUpdateBtn: QrCodeWithUpdateBtn,
	QrCodeWithTemplateUpdateBtn: QrCodeWithTemplateUpdateBtn,
} as const;

export const QRcodeGenerator = ({
	hiddenTabs = [],
	hiddenContentTypes = [],
	isEditMode,
	backLink,
	generatorType,
}: QRcodeGeneratorProps) => {
	const t = useTranslations('generator');
	const { name, updateName } = useQrCodeGeneratorStore((state) => state);
	const [currentTab, setCurrentTab] = useState<GeneratorTab>('content');
	// const [currentTab, setCurrentTab] = useState('qrCodeContent');

	const visibleTabs = useMemo(
		() => GENERATOR_TABS.filter((t) => !hiddenTabs.includes(t.type)),
		[hiddenTabs],
	);

	const GridCols = `grid-cols-${visibleTabs.length}` as const;

	const QrOutputComponent = QR_OUTPUT_MAP[generatorType];

	return (
		<Tabs
			defaultValue={currentTab}
			onValueChange={(v) => setCurrentTab(v as GeneratorTab)}
			value={currentTab}
		>
			<TabsList className={`mx-auto grid h-auto max-w-[450px] ${GridCols} bg-white p-2 shadow`}>
				{visibleTabs.map(({ type, labelKey, icon: Icon }) => (
					<TabsTrigger key={type} value={type} className="data-[state=active]:bg-gray-200">
						<div className="flex items-center gap-2">
							<Icon className="hidden h-6 w-6 xs:block" />
							<span>{t(labelKey)}</span>
						</div>
					</TabsTrigger>
				))}
			</TabsList>

			<div className="mt-4 flex">
				<div className="mx-auto flex min-h-[500px] max-w-[1200px] flex-1 rounded-lg bg-white shadow relative">
					{backLink}
					<div className="flex flex-1 flex-col p-6 md:flex-row md:gap-12">
						<div className="flex-1">
							{isEditMode && currentTab === 'content' && (
								<div className="mb-8 max-w-md space-y-2">
									<label className="text-sm font-medium">{t('labelName')}</label>
									<Input
										value={name}
										maxLength={32}
										onChange={(e) => updateName(e.target.value)}
										placeholder={t('labelName')}
									/>
								</div>
							)}

							<TabsContent value="content">
								<ContentSwitch hiddenTabs={hiddenContentTypes} isEditMode={isEditMode} />
							</TabsContent>

							<TabsContent value="style">
								<SettingsForm />
							</TabsContent>

							<TabsContent value="templates">
								<TemplateTabs />
							</TabsContent>
						</div>

						<QrOutputComponent />
					</div>
				</div>
			</div>
		</Tabs>
	);
};
