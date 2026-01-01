'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlSection } from './UrlSection';
import { TextSection } from './TextSection';
import { VCardSection } from './VcardSection';
import { WiFiSection } from './WiFiSection';
import { getDefaultContentByType, type TQrCodeContentType } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useTranslations } from 'next-intl';
import { EditUrlSection } from './EditUrlSection';
import { BulkImport } from './BulkImport';
import { Badge } from '@/components/ui/badge';
import { EmailSection } from './EmailSection';
import { LocationSection } from './LocationSection';
import { EventSection } from './EventSection';
import { CONTENT_TYPE_CONFIGS } from '@/lib/content-type.config';

type ContentSwitchProps = {
	hiddenTabs?: TQrCodeContentType[];
	isEditMode?: boolean;
};

type TabConfig<T extends TQrCodeContentType = TQrCodeContentType> = {
	type: T;
	label: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	hidden?: boolean;
	enableBulk: boolean;
	render: (props: {
		value: any;
		onChange: (v: any) => void;
		isEditMode: boolean;
	}) => React.ReactNode;
};

const TABS: TabConfig[] = CONTENT_TYPE_CONFIGS.map((config) => ({
	...config,
	render: ({ value, onChange, isEditMode }) => {
		switch (config.type) {
			case 'url':
				return isEditMode ? (
					<EditUrlSection value={value} onChange={onChange} />
				) : (
					<UrlSection value={value} onChange={onChange} />
				);
			case 'text':
				return <TextSection value={value} onChange={onChange} />;
			case 'wifi':
				return <WiFiSection value={value} onChange={onChange} />;
			case 'vCard':
				return <VCardSection value={value} onChange={onChange} />;
			case 'email':
				return <EmailSection value={value} onChange={onChange} />;
			case 'location':
				return <LocationSection value={value} onChange={onChange} />;
			case 'event':
				return <EventSection value={value} onChange={onChange} />;
			default:
				return null;
		}
	},
}));

export const ContentSwitch = ({ hiddenTabs = [], isEditMode }: ContentSwitchProps) => {
	const t = useTranslations('generator.contentSwitch');
	const t2 = useTranslations('general');

	const { content, updateContent, bulkMode, updateBulkMode } = useQrCodeGeneratorStore(
		(state) => state,
	);

	const activeTab = TABS.find((t) => t.type === content.type);
	const bulkAllowed = activeTab?.enableBulk;

	const visibleTabs = TABS.filter((tab) => !hiddenTabs.includes(tab.type));

	return (
		<Tabs
			defaultValue={content.type}
			className="max-w-[650px]"
			suppressHydrationWarning
			onValueChange={(value) => updateContent(getDefaultContentByType(value as TQrCodeContentType))}
		>
			<TabsList
				className={`mb-6 grid h-auto grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4`}
			>
				{visibleTabs.map(({ type, icon: Icon, label }) => (
					<TabsTrigger key={type} value={type} asChild>
						<button className={buttonVariants({ variant: 'tab' })}>
							<Icon className="mr-2 h-6 w-6 min-w-5" />
							{t(`tab.${label}`)}
						</button>
					</TabsTrigger>
				))}
			</TabsList>

			{/* Bulk Header */}
			{!isEditMode && bulkAllowed && (
				<div className="flex justify-between mb-4">
					<div></div>

					{bulkMode.isBulkMode ? (
						<Button variant="link" onClick={() => updateBulkMode(false)}>
							{t('cancel')}
						</Button>
					) : (
						<Button variant="link" onClick={() => updateBulkMode(true)}>
							<DocumentArrowUpIcon className="mr-1.5 h-6 w-6" />
							{t('bulkModeBtn')}
							<Badge className="ml-2 hidden xs:block">{t2('newBadge')}</Badge>
						</Button>
					)}
				</div>
			)}

			{/* Content */}
			{bulkMode.isBulkMode && bulkAllowed ? (
				<BulkImport contentType={content.type} />
			) : (
				visibleTabs.map((tab) => (
					<TabsContent key={tab.type} value={tab.type}>
						{tab.render({
							value: content.data,
							isEditMode: !!isEditMode,
							onChange: (v) => updateContent({ type: tab.type, data: v }),
						})}
					</TabsContent>
				))
			)}
		</Tabs>
	);
};
