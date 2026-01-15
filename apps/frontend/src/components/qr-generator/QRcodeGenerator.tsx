'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { PaintBrushIcon, QrCodeIcon, StarIcon } from '@heroicons/react/24/outline';

import { ContentSwitch } from './content/ContentSwitch';
import { SettingsForm } from './style/SettingsForm';
import { TemplateTabs } from './templates/TemplateTabs';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import { QrCodeWithDownloadBtn } from './QrCodeWithDownloadBtn';
import { QrCodeWithUpdateBtn } from './QrCodeWithUpdateBtn';
import { QrCodeWithTemplateUpdateBtn } from './templates/QrCodeWithTemplateUpdateBtn';
import type { TQrCodeContentType } from '@shared/schemas';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';
import { CharacterCounter } from './content/CharacterCounter';

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

	const visibleTabs = useMemo(
		() => GENERATOR_TABS.filter((t) => !hiddenTabs.includes(t.type)),
		[hiddenTabs],
	);

	// Map visible tab count to actual Tailwind grid-cols classes
	// Tailwind needs full class names at build time, can't use dynamic strings
	const gridColsClass = useMemo(() => {
		switch (visibleTabs.length) {
			case 1:
				return 'grid-cols-1';
			case 2:
				return 'grid-cols-2';
			case 3:
				return 'grid-cols-3';
			default:
				return 'grid-cols-3';
		}
	}, [visibleTabs.length]);

	// Stable callbacks
	const handleTabChange = useCallback((v: string) => {
		setCurrentTab(v as GeneratorTab);
	}, []);

	const handleNameChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			updateName(e.target.value);
		},
		[updateName],
	);
	const QrOutputComponent = QR_OUTPUT_MAP[generatorType];

	return (
		<Tabs defaultValue={currentTab} onValueChange={handleTabChange} value={currentTab}>
			<TabsList className={`mx-auto grid h-auto max-w-[450px] ${gridColsClass} bg-white p-2`}>
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
				<div className="mx-auto flex min-h-[500px] max-w-[1200px] flex-1 rounded-2xl from-white to-white/60 bg-gradient-to-br relative">
					{backLink}
					<div className="flex flex-1 flex-col p-6 md:flex-row md:gap-12">
						<div className="flex-1 mb-10 md:mb-0">
							{isEditMode && currentTab === 'content' && (
								<div className="mb-8 max-w-md">
									<div className="text-sm font-medium mb-2">{t('labelName')}</div>
									<InputGroup>
										<InputGroupInput
											value={name}
											maxLength={32}
											onChange={handleNameChange}
											placeholder={t('labelName')}
											className="pr-16"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={name?.length || 0} max={32} />
										</InputGroupAddon>
									</InputGroup>
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
