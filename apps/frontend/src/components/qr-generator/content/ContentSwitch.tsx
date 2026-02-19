'use client';

import { useMemo, useCallback } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlSection } from './UrlSection';
import { TextSection } from './TextSection';
import { VCardSection } from './VcardSection';
import { EditVCardSection } from './EditVCardSection';
import { WiFiSection } from './WiFiSection';
import { getDefaultContentByType, type TQrCodeContentType } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useTranslations } from 'next-intl';
import { EditUrlSection } from './EditUrlSection';
import { BulkImport } from './BulkImport';
import { EmailSection } from './EmailSection';
import { LocationSection } from './LocationSection';
import { EventSection } from './EventSection';
import { EpcSection } from './EpcSection';
import { CONTENT_TYPE_CONFIGS } from '@/lib/content-type.config';
import { DynamicBadge } from '../DynamicBadge';
import { useAuth } from '@clerk/nextjs';

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
};

// Stable component map - prevents recreation on every render
const CONTENT_COMPONENTS = {
	url: { edit: EditUrlSection, view: UrlSection },
	text: { edit: TextSection, view: TextSection },
	wifi: { edit: WiFiSection, view: WiFiSection },
	vCard: { edit: EditVCardSection, view: VCardSection },
	email: { edit: EmailSection, view: EmailSection },
	location: { edit: LocationSection, view: LocationSection },
	event: { edit: EventSection, view: EventSection },
	epc: { edit: EpcSection, view: EpcSection },
} as const;

const TABS: TabConfig[] = CONTENT_TYPE_CONFIGS.map((config) => ({
	type: config.type,
	label: config.label,
	icon: config.icon,
	enableBulk: config.enableBulk,
}));

export const ContentSwitch = ({ hiddenTabs = [], isEditMode }: ContentSwitchProps) => {
	const t = useTranslations('generator.contentSwitch');
	const { isSignedIn } = useAuth();

	const { content, updateContent, bulkMode, updateBulkMode } = useQrCodeGeneratorStore(
		(state) => state,
	);

	const activeTab = TABS.find((t) => t.type === content.type);
	const bulkAllowed = activeTab?.enableBulk;

	// Memoize visibleTabs to prevent unnecessary recalculation
	const visibleTabs = useMemo(
		() => TABS.filter((tab) => !hiddenTabs.includes(tab.type)),
		[hiddenTabs],
	);

	// Stable callback for content updates
	const handleContentUpdate = useCallback(
		(type: TQrCodeContentType, data: any) => {
			updateContent({ type, data });
		},
		[updateContent],
	);

	// Create stable onChange callbacks for each content type
	const onChangeCallbacks = useMemo(() => {
		const callbacks: Record<TQrCodeContentType, (data: any) => void> = {} as any;
		visibleTabs.forEach((tab) => {
			callbacks[tab.type] = (data: any) => handleContentUpdate(tab.type, data);
		});
		return callbacks;
	}, [visibleTabs, handleContentUpdate]);

	return (
		<Tabs
			defaultValue={content.type}
			className="max-w-[650px]"
			suppressHydrationWarning
			onValueChange={(value) =>
				updateContent(getDefaultContentByType(value as TQrCodeContentType, isSignedIn === true))
			}
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
				<div className="flex justify-between mb-4 items-center">
					{/* Dynamic Badge - For URL and vCard types */}
					{content.type === 'url' ? (
						<DynamicBadge
							checked={content.data.isEditable ?? true}
							onChange={(checked) => {
								updateContent({
									type: 'url',
									data: {
										...content.data,
										isEditable: checked,
									},
								});
							}}
						/>
					) : content.type === 'vCard' ? (
						<DynamicBadge
							checked={content.data.isDynamic ?? true}
							onChange={(checked) => {
								updateContent({
									type: 'vCard',
									data: {
										...content.data,
										isDynamic: checked,
									},
								});
							}}
						/>
					) : (
						<div></div>
					)}

					<div className="hidden sm:block">
						{bulkMode.isBulkMode ? (
							<Button variant="link" onClick={() => updateBulkMode(false)}>
								{t('cancel')}
							</Button>
						) : (
							<Button variant="link" className="p-0" onClick={() => updateBulkMode(true)}>
								<DocumentArrowUpIcon className="sm:mr-1.5 h-8 w-8 sm:h-6 sm:w-6" />
								<span>{t('bulkModeBtn')}</span>
							</Button>
						)}
					</div>
				</div>
			)}

			{/* Content */}
			{bulkMode.isBulkMode && bulkAllowed ? (
				<BulkImport contentType={content.type} />
			) : (
				visibleTabs.map((tab) => {
					const Component = CONTENT_COMPONENTS[tab.type][isEditMode ? 'edit' : 'view'];
					return (
						<TabsContent key={tab.type} value={tab.type} className="pt-2">
							<Component value={content.data as any} onChange={onChangeCallbacks[tab.type]} />
						</TabsContent>
					);
				})
			)}
		</Tabs>
	);
};
