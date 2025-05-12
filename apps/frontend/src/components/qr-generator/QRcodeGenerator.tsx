'use client';

import { SettingsForm } from './style/SettingsForm';
import { PaintBrushIcon, QrCodeIcon, StarIcon } from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentSwitch } from './content/ContentSwitch';
import { TemplateTabs } from './templates/TemplateTabs';
import { QrCodeWithDownloadBtn } from './QrCodeWithDownloadBtn';
import { useTranslations } from 'next-intl';

export const QRcodeGenerator = () => {
	const t = useTranslations('generator');
	return (
		<Tabs defaultValue="qrCodeContent">
			<TabsList className="mx-auto grid h-auto max-w-[450px] grid-cols-3 bg-white p-2 shadow">
				<TabsTrigger value="qrCodeContent" className="data-[state=active]:bg-gray-200">
					<div className="flex space-x-2">
						<QrCodeIcon className="xs:block hidden h-6 w-6" />{' '}
						<span className="flex flex-col justify-center">{t('tabs.content')}</span>
					</div>
				</TabsTrigger>
				<TabsTrigger value="qrCodeSettings" className="data-[state=active]:bg-gray-200">
					<div className="flex space-x-2">
						<PaintBrushIcon className="xs:block hidden h-6 w-6" />{' '}
						<span className="flex flex-col justify-center">{t('tabs.style')}</span>
					</div>
				</TabsTrigger>
				<TabsTrigger value="qrCodeTemplates" className="data-[state=active]:bg-gray-200">
					<div className="flex space-x-2">
						<StarIcon className="xs:block hidden h-6 w-6" />{' '}
						<span className="flex flex-col justify-center">{t('tabs.templates')}</span>
					</div>
				</TabsTrigger>
			</TabsList>
			<div className="relative mt-4 flex space-x-6">
				<div className="mx-auto min-h-[500px] max-w-[1200px] flex-1 overflow-hidden rounded-lg bg-white shadow">
					<div className="px-4 py-5 sm:p-10">
						<div className="flex flex-col space-y-10 md:flex-row md:space-y-0 md:space-x-12">
							<div className="flex-1">
								<TabsContent value="qrCodeContent" className="ac mt-0 h-full">
									<ContentSwitch />
								</TabsContent>
								<TabsContent value="qrCodeSettings" className="mt-0">
									<SettingsForm />
								</TabsContent>
								<TabsContent value="qrCodeTemplates" className="mt-0">
									<TemplateTabs />
								</TabsContent>
							</div>
							<QrCodeWithDownloadBtn />
						</div>
					</div>
				</div>
			</div>
		</Tabs>
	);
};
