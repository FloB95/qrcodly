'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import {
	DocumentTextIcon,
	LinkIcon,
	WifiIcon,
	IdentificationIcon,
	DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlSection } from './UrlSection';
import { TextSection } from './TextSection';
import { VCardSection } from './VcardSection';
import { WiFiSection } from './WiFiSection';
import {
	getDefaultContentByType,
	type TQrCodeContentType,
	type TTextInput,
	type TUrlInput,
	type TVCardInput,
	type TWifiInput,
} from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useTranslations } from 'next-intl';
import { EditUrlSection } from './EditUrlSection';
import { BulkImport } from './BulkImport';

type ContentSwitchProps = {
	hideContentUrlTab?: boolean;
	hideContentTextTab?: boolean;
	hideContentWifiTab?: boolean;
	hideContentVCardTab?: boolean;

	isEditMode?: boolean;
};

export const ContentSwitch = ({
	hideContentUrlTab,
	hideContentTextTab,
	hideContentWifiTab,
	hideContentVCardTab,
	isEditMode,
}: ContentSwitchProps) => {
	const t = useTranslations('generator.contentSwitch');
	const { content, updateContent, bulkMode, updateBulkMode } = useQrCodeGeneratorStore(
		(state) => state,
	);
	return (
		<Tabs
			defaultValue={content.type}
			className="max-w-[650px]"
			suppressHydrationWarning
			onValueChange={(value) => {
				updateContent(getDefaultContentByType(value as TQrCodeContentType));
			}}
		>
			<TabsList className="mb-3 grid h-auto grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
				{!hideContentUrlTab && (
					<TabsTrigger value="url" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<LinkIcon className="mr-2 h-6 w-6" /> {t('tab.url')}
						</button>
					</TabsTrigger>
				)}
				{!hideContentTextTab && (
					<TabsTrigger value="text" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<DocumentTextIcon className="mr-2 h-6 w-6" /> {t('tab.text')}
						</button>
					</TabsTrigger>
				)}
				{!hideContentWifiTab && (
					<TabsTrigger value="wifi" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<WifiIcon className="mr-2 h-6 w-6" /> {t('tab.wifi')}
						</button>
					</TabsTrigger>
				)}
				{!hideContentVCardTab && (
					<TabsTrigger value="vCard" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<IdentificationIcon className="mr-2 h-6 w-6" /> {t('tab.vCard')}
						</button>
					</TabsTrigger>
				)}
			</TabsList>
			<div className="flex flex-row-reverse cursor-pointer">
				{bulkMode.isBulkMode ? (
					<Button variant="link" onClick={() => updateBulkMode(false, undefined)}>
						{t('cancel')}
					</Button>
				) : (
					<Button className="mb-2" variant="link" onClick={() => updateBulkMode(true, undefined)}>
						<DocumentArrowUpIcon className="w-6 h-6 mr-1.5" /> {t('bulkModeBtn')}
					</Button>
				)}
			</div>

			{bulkMode.isBulkMode ? (
				<BulkImport contentType={content.type} />
			) : (
				<>
					{!hideContentUrlTab && (
						<TabsContent value="url">
							{isEditMode ? (
								<EditUrlSection
									value={content.data as TUrlInput}
									onChange={(v) => {
										updateContent({
											type: 'url',
											data: v,
										});
									}}
								/>
							) : (
								<UrlSection
									value={content.data as TUrlInput}
									onChange={(v) => {
										updateContent({
											type: 'url',
											data: v,
										});
									}}
								/>
							)}
						</TabsContent>
					)}
					{!hideContentTextTab && (
						<TabsContent value="text" className="h-full">
							<TextSection
								value={content.data as TTextInput}
								onChange={(v) => {
									updateContent({
										type: 'text',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}
					{!hideContentWifiTab && (
						<TabsContent value="wifi">
							<WiFiSection
								value={content.data as TWifiInput}
								onChange={(v) => {
									updateContent({
										type: 'wifi',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}
					{!hideContentVCardTab && (
						<TabsContent value="vCard">
							<VCardSection
								value={content.data as TVCardInput}
								onChange={(v) => {
									updateContent({
										type: 'vCard',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}
				</>
			)}
		</Tabs>
	);
};
