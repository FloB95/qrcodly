'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import {
	DocumentTextIcon,
	LinkIcon,
	WifiIcon,
	IdentificationIcon,
	DocumentArrowUpIcon,
	MapPinIcon,
	CalendarDaysIcon,
	EnvelopeOpenIcon,
	CheckBadgeIcon,
} from '@heroicons/react/24/outline';
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

type ContentSwitchProps = {
	hiddenTabs?: TQrCodeContentType[];
	isEditMode?: boolean;
};

type TabConfig<T extends TQrCodeContentType = TQrCodeContentType> = {
	type: T;
	label: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	hidden?: boolean;
	enableBulk?: boolean;
	render: (props: {
		value: any;
		onChange: (v: any) => void;
		isEditMode: boolean;
	}) => React.ReactNode;
};

const TABS: TabConfig[] = [
	{
		type: 'url',
		label: 'url',
		icon: LinkIcon,
		enableBulk: true,
		render: ({ value, onChange, isEditMode }) =>
			isEditMode ? (
				<EditUrlSection value={value} onChange={onChange} />
			) : (
				<UrlSection value={value} onChange={onChange} />
			),
	},
	{
		type: 'text',
		label: 'text',
		icon: DocumentTextIcon,
		enableBulk: true,
		render: ({ value, onChange }) => <TextSection value={value} onChange={onChange} />,
	},
	{
		type: 'wifi',
		label: 'wifi',
		icon: WifiIcon,
		enableBulk: true,
		render: ({ value, onChange }) => <WiFiSection value={value} onChange={onChange} />,
	},
	{
		type: 'vCard',
		label: 'vCard',
		icon: IdentificationIcon,
		enableBulk: true,
		render: ({ value, onChange }) => <VCardSection value={value} onChange={onChange} />,
	},
	{
		type: 'email',
		label: 'email',
		icon: EnvelopeOpenIcon,
		enableBulk: true,
		render: ({ value, onChange }) => <EmailSection value={value} onChange={onChange} />,
	},
	{
		type: 'location',
		label: 'location',
		icon: MapPinIcon,
		enableBulk: false,
		render: ({ value, onChange }) => <LocationSection value={value} onChange={onChange} />,
	},
	{
		type: 'event',
		label: 'event',
		icon: CalendarDaysIcon,
		enableBulk: true,
		render: ({ value, onChange }) => <EventSection value={value} onChange={onChange} />,
	},
];

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
				className={`${isEditMode ? 'mb-6' : 'mb-3 '} grid h-auto grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4`}
			>
				{visibleTabs.map(({ type, icon: Icon, label }) => (
					<TabsTrigger key={type} value={type} asChild>
						<button className={buttonVariants({ variant: 'tab' })}>
							<Icon className="mr-2 h-6 w-6" />
							{t(`tab.${label}`)}
						</button>
					</TabsTrigger>
				))}
			</TabsList>

			{/* Bulk Header */}
			{!isEditMode && bulkAllowed && (
				<div className="flex justify-between pt-1 mb-6">
					<Badge className="text-sm">
						Dynamic <CheckBadgeIcon className="ml-2 h-5 w-5" />
					</Badge>

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
