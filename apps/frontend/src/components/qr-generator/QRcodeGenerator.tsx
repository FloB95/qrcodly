'use client';

import { SettingsForm } from './style/SettingsForm';
import { PaintBrushIcon, QrCodeIcon, StarIcon } from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentSwitch } from './content/ContentSwitch';
import { TemplateTabs } from './templates/TemplateTabs';
import { QrCodeWithDownloadBtn } from './QrCodeWithDownloadBtn';
import { useTranslations } from 'next-intl';
import { QrCodeWithUpdateBtn } from './QrCodeWithUpdateBtn';
import { Input } from '../ui/input';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import React, { useState } from 'react';
import { QrCodeWithTemplateUpdateBtn } from './templates/QrCodeWithTemplateUpdateBtn';

type QrCodeGeneratorType =
	| 'QrCodeWithDownloadBtn'
	| 'QrCodeWithUpdateBtn'
	| 'QrCodeWithTemplateUpdateBtn';

type QRcodeGeneratorProps = {
	hideContentTab?: boolean;
	hideTemplateTab?: boolean;
	hideStyleTab?: boolean;

	hideContentUrlTab?: boolean;
	hideContentTextTab?: boolean;
	hideContentWifiTab?: boolean;
	hideContentVCardTab?: boolean;

	isEditMode?: boolean;

	backLink?: React.ReactNode;
	generatorType: QrCodeGeneratorType;
};

export const QRcodeGenerator = ({
	hideContentTab,
	hideTemplateTab,
	hideStyleTab,
	hideContentUrlTab,
	hideContentTextTab,
	hideContentWifiTab,
	hideContentVCardTab,
	isEditMode,
	backLink,
	generatorType = 'QrCodeWithDownloadBtn',
}: QRcodeGeneratorProps) => {
	const t = useTranslations('generator');
	const { name, updateName } = useQrCodeGeneratorStore((state) => state);
	const [currentTab, setCurrentTab] = useState('qrCodeContent');
	const gridColsMap: Record<number, string> = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
	};

	const visibleTabs = [hideContentTab, hideStyleTab, hideTemplateTab].reduce(
		(count, tab) => count + (tab ? 0 : 1),
		0,
	);

	const qrCodeWithButton = () => {
		switch (generatorType) {
			case 'QrCodeWithDownloadBtn':
				return <QrCodeWithDownloadBtn />;
			case 'QrCodeWithUpdateBtn':
				return <QrCodeWithUpdateBtn />;
			case 'QrCodeWithTemplateUpdateBtn':
				return <QrCodeWithTemplateUpdateBtn />;
			default:
				return <QrCodeWithDownloadBtn />;
		}
	};

	return (
		<div className="relative">
			<Tabs defaultValue={currentTab} onValueChange={setCurrentTab} value={currentTab}>
				<TabsList
					className={`mx-auto grid h-auto max-w-[450px] ${gridColsMap[visibleTabs]} bg-white p-2 shadow`}
				>
					{!hideContentTab && (
						<TabsTrigger value="qrCodeContent" className="data-[state=active]:bg-gray-200">
							<div className="flex space-x-2">
								<QrCodeIcon className="xs:block hidden h-6 w-6" />{' '}
								<span className="flex flex-col justify-center">{t('tabs.content')}</span>
							</div>
						</TabsTrigger>
					)}
					{!hideStyleTab && (
						<TabsTrigger value="qrCodeSettings" className="data-[state=active]:bg-gray-200">
							<div className="flex space-x-2">
								<PaintBrushIcon className="xs:block hidden h-6 w-6" />{' '}
								<span className="flex flex-col justify-center">{t('tabs.style')}</span>
							</div>
						</TabsTrigger>
					)}
					{!hideTemplateTab && (
						<TabsTrigger value="qrCodeTemplates" className="data-[state=active]:bg-gray-200">
							<div className="flex space-x-2">
								<StarIcon className="xs:block hidden h-6 w-6" />{' '}
								<span className="flex flex-col justify-center">{t('tabs.templates')}</span>
							</div>
						</TabsTrigger>
					)}
				</TabsList>
				<div className="relative mt-4 flex space-x-6">
					<div className="mx-auto min-h-[500px] max-w-[1200px] flex-1 overflow-hidden rounded-lg bg-white shadow">
						{backLink}
						<div className="px-4 py-5 sm:p-10">
							<div className="flex flex-col space-y-10 md:flex-row md:space-y-0 md:space-x-12">
								<div className="flex-1">
									{isEditMode && currentTab === 'qrCodeContent' && (
										<div className="mb-10 flex flex-col space-y-4">
											<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
												<span translate="no">{t('labelName')}</span>
											</label>
											<Input
												type="text"
												className="max-w-md"
												value={name}
												placeholder={t('labelName')}
												maxLength={32}
												onChange={(e) => {
													updateName(e.target.value);
												}}
											/>
										</div>
									)}

									{!hideContentTab && (
										<TabsContent value="qrCodeContent" className="ac mt-0 h-full">
											<ContentSwitch
												hideContentTextTab={hideContentTextTab}
												hideContentUrlTab={hideContentUrlTab}
												hideContentVCardTab={hideContentVCardTab}
												hideContentWifiTab={hideContentWifiTab}
												isEditMode={isEditMode}
											/>
										</TabsContent>
									)}
									{!hideStyleTab && (
										<TabsContent value="qrCodeSettings" className="mt-0">
											<SettingsForm />
										</TabsContent>
									)}
									{!hideTemplateTab && (
										<TabsContent value="qrCodeTemplates" className="mt-0">
											<TemplateTabs />
										</TabsContent>
									)}
								</div>

								{qrCodeWithButton()}
							</div>
						</div>
					</div>
				</div>
			</Tabs>
		</div>
	);
};
